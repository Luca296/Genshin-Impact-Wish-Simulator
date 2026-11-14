const { _electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
	out = path.resolve(root, '../outputs/progression-verification');
fs.mkdirSync(out, { recursive: true });
const profile = path.join(out, 'profile-' + Date.now());
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app, page;
const report = { steps: [], errors: [], missing: [] };
const customArt =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPzQAAAAASUVORK5CYII=';
const snapshot = () => page.evaluate(async () => JSON.parse(await window.offlineGame.snapshot()));
async function step(name, fn) {
	console.log('START', name);
	await fn();
	report.steps.push(name);
	console.log('PASS', name);
}
async function ready() {
	await page.waitForFunction(() => !!window.offlineGame);
	const welcome = page.locator('.modal .pop-footer button').last();
	if (await welcome.isVisible()) await welcome.click();
	await page.locator('.loader').first().waitFor({ state: 'hidden', timeout: 60000 });
	await page.getByRole('button', { name: 'Inventory', exact: true }).waitFor();
}
(async () => {
	try {
		app = await _electron.launch({
			executablePath: process.argv[2] || path.join(root, 'node_modules/electron/dist/electron.exe'),
			args: [...(process.argv[2] ? [] : [root]), '--profile=' + profile],
			cwd: root,
			env,
			timeout: 90000
		});
		page = await app.firstWindow();
		page.setDefaultTimeout(15000);
		page.on('pageerror', (e) => report.errors.push(String(e)));
		page.on('response', (r) => {
			if (r.status() >= 400) report.missing.push(r.url());
		});
		await ready();
		await step('legacy save migrates to unspent resources', async () => {
			const seed = await snapshot();
			delete seed.settings.data.inventoryIdentityVersion;
			seed.settings.data.ownedItem = {
				29: { manual: 0, wish: 101 },
				6: { manual: 0, wish: 1 },
				12: { manual: 0, wish: 1 },
				120: { manual: 0, wish: 4 },
				82: { manual: 0, wish: 2 },
				70000001: { manual: 0, wish: 2 }
			};
			seed.banners = [
				{
					itemID: 70000001,
					character: 'Custom Companion',
					status: 'owned',
					vision: 'anemo',
					images: { artURL: customArt, faceURL: customArt }
				}
			];
			await page.evaluate((s) => window.offlineGame.restoreBackup(JSON.stringify(s)), seed);
			await page.reload();
			await ready();
			const data = (await snapshot()).settings.data.ownedItem;
			assert.equal(data[29].activated, 0);
			assert.equal(data[120].copies.length, 4);
		});
		await step(
			'constellation UI spends materials only after activation and reaches C100',
			async () => {
				await page.getByRole('button', { name: 'Inventory', exact: true }).click();
				await page.getByRole('button', { name: 'Hu Tao C0', exact: true }).click();
				await page.getByRole('button', { name: 'Constellation', exact: true }).click();
				await page.getByText('100 Stela Fortuna available', { exact: true }).waitFor();
				assert.equal((await snapshot()).settings.data.ownedItem[29].activated, 0);
				await page.getByRole('button', { name: 'C1 Crimson Bouquet', exact: true }).click();
				await page.getByLabel('Constellations to activate').fill('100');
				await page.getByRole('button', { name: 'Activate C100', exact: true }).click();
				await page.getByText('0 Stela Fortuna available', { exact: true }).waitFor();
				await page.getByLabel('Close constellation', { exact: true }).click();
				assert.equal((await snapshot()).settings.data.ownedItem[29].activated, 100);
				await page.screenshot({ path: path.join(out, 'constellations-c100.png') });
			}
		);
		await step('real attributes, weapon equipment and talent damage render', async () => {
			await page.getByRole('button', { name: 'Attributes', exact: true }).click();
			await page.screenshot({ path: path.join(out, 'attributes.png') });
			await page.getByRole('button', { name: 'Details', exact: true }).click();
			await page.getByText('Advanced Stats', { exact: true }).waitFor();
			await page.screenshot({ path: path.join(out, 'attribute-details.png') });
			await page.getByLabel('Close stats', { exact: true }).click();
			await page.getByRole('button', { name: 'Weapons', exact: true }).click();
			await page.getByRole('button', { name: 'Switch', exact: true }).click();
			await page.getByRole('button', { name: 'Staff of Homa Copy 2 R1', exact: true }).click();
			await page.getByLabel('All weapon classes', { exact: true }).check();
			assert.equal(
				await page
					.getByRole('button', { name: 'Cool Steel Copy 1 R1 incompatible class', exact: true })
					.isDisabled(),
				true
			);
			await page.screenshot({ path: path.join(out, 'weapon-selection.png') });
			await page.getByRole('button', { name: 'Equip', exact: true }).click();
			const equipped = (await snapshot()).settings.data.ownedItem[29].build.weaponCopyID;
			assert.equal(equipped, (await snapshot()).settings.data.ownedItem[120].copies[1].id);
			await page.screenshot({ path: path.join(out, 'character-weapon.png') });
			await page.getByRole('button', { name: 'Talents', exact: true }).click();
			await page.screenshot({ path: path.join(out, 'talents.png') });
			await page.getByRole('button', { name: /Normal Attack: Secret Spear of Wangsheng/ }).click();
			await page.getByRole('button', { name: 'Skill Attributes', exact: true }).click();
			assert.ok((await page.locator('.talent-detail .skill-attributes > div').count()) > 5);
			await page.screenshot({ path: path.join(out, 'talent-attributes.png') });
			await page.getByRole('button', { name: 'Damage', exact: true }).click();
			assert.ok((await page.locator('.talent-detail tbody tr').count()) > 5);
			assert.ok(!(await page.locator('.character-sheet').innerText()).includes('NaN'));
			await page.screenshot({ path: path.join(out, 'talent-damage.png') });
			await page.keyboard.press('Escape');
			await page.getByLabel('Close details', { exact: true }).click();
		});
		await step(
			'weapons appear as separate R1 copies and refinement removes selected material',
			async () => {
				await page.locator('#inventory .navigation .nav-link').nth(1).click();
				await page.getByRole('button', { name: 'Staff of Homa R1', exact: true }).first().waitFor();
				assert.equal(
					await page.getByRole('button', { name: 'Staff of Homa R1', exact: true }).count(),
					4
				);
				await page.getByRole('button', { name: 'Staff of Homa R1', exact: true }).first().click();
				await page
					.locator('.menu-navigation')
					.getByRole('button', { name: 'Refine', exact: true })
					.click();
				const before = (await snapshot()).settings.data.ownedItem[120];
				const donor = before.copies[2];
				await page.getByLabel('Choose refinement material', { exact: true }).click();
				assert.equal(
					await page.getByRole('button', { name: 'Material Copy 2 R1', exact: true }).isDisabled(),
					true
				);
				await page.getByRole('button', { name: 'Material Copy 3 R1', exact: true }).click();
				await page.getByRole('button', { name: 'Confirm refinement to R2', exact: true }).click();
				const after = (await snapshot()).settings.data.ownedItem[120];
				assert.equal(after.copies.length, 3);
				assert.equal(after.copies[0].refinement, 2);
				assert.ok(!after.copies.some((c) => c.id === donor.id));
				await page.screenshot({ path: path.join(out, 'weapon-refinement.png') });
			}
		);
		await step('responsive layout and keyboard navigation', async () => {
			for (const size of [
				{ width: 1280, height: 720 },
				{ width: 800, height: 600 },
				{ width: 390, height: 844 }
			]) {
				await page.setViewportSize(size);
				await page.screenshot({ path: path.join(out, `refinement-${size.width}.png`) });
				const overflow = await page
					.locator('.character-sheet')
					.evaluate((e) => e.scrollWidth > e.clientWidth + 1);
				assert.equal(overflow, false);
			}
			await page.keyboard.press('Tab');
			assert.ok(
				await page.locator('.character-sheet').evaluate((e) => e.contains(document.activeElement))
			);
		});
		await step('reload and backup restore preserve upgrade state', async () => {
			const before = await snapshot();
			await page.reload();
			await ready();
			const after = await snapshot();
			assert.deepEqual(after.settings.data.ownedItem, before.settings.data.ownedItem);
			await page.evaluate((s) => window.offlineGame.restoreBackup(JSON.stringify(s)), before);
			assert.deepEqual((await snapshot()).settings.data.ownedItem, before.settings.data.ownedItem);
		});
		await step('custom character artwork and manual upgrades remain available', async () => {
			await page.setViewportSize({ width: 1280, height: 720 });
			await page.reload();
			await ready();
			await page.getByRole('button', { name: 'Inventory', exact: true }).click();
			await page.locator('#inventory .navigation .nav-link').nth(0).click();
			await page.getByRole('button', { name: 'Custom Companion C0', exact: true }).click();
			assert.equal(await page.locator('.character-stage > img').getAttribute('src'), customArt);
			await page.getByRole('button', { name: 'Constellation', exact: true }).click();
			await page.getByRole('button', { name: 'C1 Constellation', exact: true }).click();
			await page.getByRole('button', { name: 'Activate C1', exact: true }).click();
			assert.equal((await snapshot()).settings.data.ownedItem[70000001].activated, 1);
		});
		assert.deepEqual(report.errors, []);
		assert.deepEqual(report.missing, []);
	} catch (e) {
		report.failure = String(e.stack || e);
		console.error(e);
		if (page) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
		process.exitCode = 1;
	} finally {
		fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
		if (app) await app.close();
	}
})();
