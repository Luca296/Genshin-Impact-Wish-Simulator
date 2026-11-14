const { _electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
	out = path.resolve(root, '../outputs/journal-verification');
fs.mkdirSync(out, { recursive: true });
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app, page;
const errors = [];
const steps = [];
const profile = path.join(out, 'profile-' + Date.now());
const snapshot = () => page.evaluate(async () => JSON.parse(await window.offlineGame.snapshot()));
async function step(name, fn) {
	console.log('START', name);
	await fn();
	steps.push(name);
	console.log('PASS', name);
}
async function ready() {
	await page.waitForFunction(() => !!window.offlineGame);
	const welcome = page.locator('.modal .pop-footer button').last();
	if (await welcome.isVisible()) await welcome.click();
	await page.locator('.loader').first().waitFor({ state: 'hidden', timeout: 60000 });
	await page.getByRole('button', { name: 'Journal', exact: true }).waitFor();
}
(async () => {
	try {
		const packaged = process.argv[2];
		app = await _electron.launch({
			executablePath: packaged || path.join(root, 'node_modules/electron/dist/electron.exe'),
			args: [...(packaged ? [] : [root]), '--profile=' + profile],
			cwd: root,
			env,
			timeout: 90000
		});
		page = await app.firstWindow();
		page.setDefaultTimeout(15000);
		page.on('pageerror', (e) => errors.push(String(e)));
		await ready();
		await step('fresh journal has no fabricated progress', async () => {
			await page.getByRole('button', { name: 'Journal', exact: true }).click();
			await page.locator('#journal .achievement').first().waitFor();
			assert.equal(await page.locator('.achievement.earned').count(), 0);
			assert.equal((await snapshot()).settings.data.journal.stats.total, 0);
			await page.screenshot({ path: path.join(out, 'fresh-achievements.png') });
			await page.keyboard.press('Escape');
		});
		await step('backfill existing collection and histories', async () => {
			const seed = await snapshot();
			delete seed.settings.data.journal;
			const chars = JSON.parse(
				fs.readFileSync(path.join(root, 'src/lib/data/characters.json'))
			).data;
			const names = [
				'jean',
				'amber',
				'kaeya',
				'lisa',
				'klee',
				'albedo',
				'eula',
				'noelle',
				'sucrose',
				'mika',
				'dahlia',
				'skirk',
				'escoffier',
				'venti',
				'zhongli',
				'raiden-shogun',
				'nahida',
				'furina',
				'mavuika',
				'barbara',
				'beidou',
				'kaedehara-kazuha'
			];
			seed.settings.data.ownedItem = Object.fromEntries(
				chars
					.filter((x) => names.includes(x.name))
					.map((x, i) => [x.itemID, { wish: i < 5 ? 7 : 1, manual: 0 }])
			);
			seed.histories = Array.from({ length: 1000 }, (_, i) => ({
				id: i + 1,
				itemID: 11301,
				name: 'cool-steel',
				type: 'weapon',
				rarity: 3,
				banner: 'character-event',
				bannerName: 'void-stars-advent-3',
				pity: 1,
				time: 'test'
			}));
			seed.settings.data.config.autoskip = true;
			seed.settings.data.config.wishAmount = 'unlimited';
			seed.settings.data.config.multipull = 10;
			await page.evaluate((text) => window.offlineGame.restoreBackup(text), JSON.stringify(seed));
			await page.reload();
			await ready();
			await page.getByRole('button', { name: 'Journal', exact: true }).click();
			await page.locator('#journal .achievement').first().waitFor();
			const saved = (await snapshot()).settings.data.journal;
			assert.equal(saved.stats.total, 1000);
			assert.equal(saved.stats.one, 0);
			assert.ok(Object.keys(saved.earned).length > 20);
			await page.screenshot({ path: path.join(out, 'achievements.png') });
		});
		await step('search, completion filters and keyboard escape in input', async () => {
			await page.getByLabel('Search journal').fill('Written in the Stars');
			assert.ok((await page.locator('.achievement').count()) > 0);
			await page.getByLabel('Filter progress').selectOption('Completed');
			assert.equal(await page.locator('.achievement:not(.earned)').count(), 0);
			await page.getByLabel('Search journal').focus();
			await page.keyboard.press('Escape');
			await page.locator('#journal').waitFor({ state: 'hidden' });
			await page.getByRole('button', { name: 'Journal', exact: true }).click();
		});
		await step('collections, album, missing entries and featured banner links', async () => {
			await page.getByRole('button', { name: 'Collections', exact: true }).first().click();
			await page.locator('.set').first().waitFor();
			await page.screenshot({ path: path.join(out, 'collections.png') });
			await page.getByRole('button', { name: 'Regions', exact: true }).click();
			await page.locator('.set').filter({ hasText: 'Mondstadt' }).click();
			assert.ok((await page.locator('.set-filter').innerText()).includes('Mondstadt'));
			await page.screenshot({ path: path.join(out, 'album.png') });
			await page.getByLabel('Filter progress').selectOption('Missing');
			assert.equal(await page.locator('.item:not(.missing)').count(), 0);
			await page.getByRole('button', { name: 'Album', exact: true }).click();
			await page.getByLabel('Search journal').fill('Skirk');
			await page.locator('.item').first().click();
			await page.getByRole('dialog').waitFor();
			assert.ok((await page.getByRole('button', { name: /Version 7.1/ }).count()) > 0);
			await page.screenshot({ path: path.join(out, 'entry.png') });
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
		});
		await step('titles unlock, equip and persist in backup', async () => {
			await page.locator('.title-select').click();
			await page.getByRole('button', { name: /Stargazer/ }).click();
			assert.equal((await snapshot()).settings.data.journal.title, 'stargazer');
			await page.keyboard.press('Escape');
		});
		await step('actual ten-pull earns normal luck and notifies after reveal', async () => {
			await page.locator('#header .button.character-event').first().click();
			await page.evaluate(() => {
				window.__oldRandom = Math.random;
				Math.random = () => 0.999999;
			});
			await page.locator('.ten.wish-button').click();
			await page.locator('.wish-result').waitFor({ state: 'visible', timeout: 30000 });
			const state = (await snapshot()).settings.data.journal;
			assert.equal(state.stats.total, 1010);
			assert.equal(state.stats.double, 1);
			assert.equal(state.stats.triple, 1);
			assert.ok(state.earned['double-1']);
			assert.equal(await page.locator('.achievement-notice').count(), 0);
			const skip = page.locator('.wish-result button.skip');
			if (await skip.isVisible()) await skip.click();
			await page.locator('.wish-result button.close').click();
			await page.evaluate(() => (Math.random = window.__oldRandom));
			await page.locator('.achievement-notice').waitFor({ state: 'visible' });
			await page.screenshot({ path: path.join(out, 'notification.png') });
			if (await page.locator('.milestone').isVisible()) await page.keyboard.press('Space');
			await page.locator('.achievement-notice').click();
			await page.locator('#journal .achievement').first().waitFor();
			assert.equal((await snapshot()).settings.data.journal.stats.total, 1010);
		});
		await step('responsive journal and no missing artwork', async () => {
			await page.getByRole('button', { name: 'Collections', exact: true }).first().click();
			for (const size of [
				{ width: 1280, height: 720 },
				{ width: 800, height: 600 },
				{ width: 390, height: 844 },
				{ width: 844, height: 390 }
			]) {
				await page.setViewportSize(size);
				await page.screenshot({
					path: path.join(out, 'collections-' + size.width + 'x' + size.height + '.png')
				});
				assert.equal(
					await page.locator('#journal').evaluate((e) => e.scrollWidth > e.clientWidth),
					false
				);
			}
			await page.setViewportSize({ width: 1280, height: 720 });
			await page.getByRole('button', { name: 'Album', exact: true }).click();
			await page.locator('.item').first().waitFor();
			await page.locator('.scroll').evaluate((e) => (e.scrollTop = e.scrollHeight));
			await page.waitForTimeout(700);
			const missing = await page
				.locator('#journal img')
				.evaluateAll((imgs) => imgs.filter((i) => i.complete && !i.naturalWidth).map((i) => i.src));
			assert.deepEqual(missing, []);
		});
		await step('reload and backup restore preserve achievements and title', async () => {
			const saved = await snapshot();
			await page.reload();
			await ready();
			await page.getByRole('button', { name: 'Journal', exact: true }).click();
			await page.locator('#journal .achievement').first().waitFor();
			assert.deepEqual((await snapshot()).settings.data.journal, saved.settings.data.journal);
			await page.evaluate((text) => window.offlineGame.restoreBackup(text), JSON.stringify(saved));
			assert.deepEqual((await snapshot()).settings.data.journal, saved.settings.data.journal);
			assert.deepEqual(errors, []);
		});
	} catch (e) {
		console.error(e);
		process.exitCode = 1;
		try {
			await page.screenshot({ path: path.join(out, 'failure.png') });
		} catch {}
	} finally {
		fs.writeFileSync(
			path.join(out, 'results.json'),
			JSON.stringify({ steps, errors, profile }, null, 2)
		);
		if (app) await app.close();
	}
})();
