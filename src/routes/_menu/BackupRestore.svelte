<script>
import {onMount} from 'svelte';
import {snapshot,restoreBackup,flush} from '$lib/helpers/desktop';
import Button from '$lib/components/ButtonModal.svelte';
let backups=[],selected='',message='';
async function refresh(){backups=await window.desktop.list();selected=backups[0]||'';}
onMount(refresh);
async function exportFile(){try{if(await window.desktop.export(await snapshot()))message='Backup exported.'}catch(e){message=e.message}}
async function restore(text){if(!text)return;if(!confirm('Restore backup? Current progress will be backed up first.'))return;await restoreBackup(text);location.reload();}
async function importFile(){try{await restore(await window.desktop.import())}catch(e){message=e.message}}
async function restoreAuto(){try{await restore(await window.desktop.restore(selected))}catch(e){message=e.message}}
async function backupNow(){try{await flush();await refresh();message='Automatic backup saved.'}catch(e){message=e.message}}
</script>
<div class="backupRestore content-container">
<h2>Local backups</h2>
<p>Progress is saved in your application data folder. Automatic backups keep the latest 20 snapshots, including custom-banner artwork.</p>
<div class="actions"><Button on:click={exportFile}>Export backup</Button><Button on:click={importFile}>Import backup</Button><Button on:click={backupNow}>Back up now</Button></div>
<h2>Restore automatic backup</h2>
<select aria-label="Automatic backup" bind:value={selected}>{#each backups as name}<option value={name}>{name}</option>{/each}</select>
<Button on:click={restoreAuto} disabled={!selected}>Restore selected backup</Button>
<p role="status">{message}</p>
<p>Compatible with upstream JSON .bin backups. Membership keys and remote-only artwork are not imported as offline entitlements or assets.</p>
</div>
<style>.content-container{background:#fbf6ee;color:#565654;border-radius:.5rem;padding:2rem;overflow:auto;height:100%}h2{margin:1rem 0}p{margin:1rem 0;line-height:1.5}.actions{display:flex;gap:1rem;flex-wrap:wrap}select{display:block;width:100%;padding:1rem;margin-bottom:1rem;background:#fff;color:#565654}</style>
