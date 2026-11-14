<script>
import {getContext} from 'svelte';
import Modal from '$lib/components/ModalTpl.svelte';
import {snapshot} from '$lib/helpers/desktop';
const close=getContext('closePublisher');
async function exportLocal(){await window.desktop.export(await snapshot());close();}
</script>
<Modal confirmOnly title="Export local banner" on:confirm={exportLocal}>
<p>Save a local backup containing your custom banners, artwork and progress. Import it from Game → Import backup on another offline installation.</p>
</Modal>
