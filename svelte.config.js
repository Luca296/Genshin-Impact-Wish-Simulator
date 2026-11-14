import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
export default { kit: { appDir: 'internal', adapter: adapter({fallback:'index.html'}), alias: { $post: './src/post' } }, preprocess: preprocess({postcss:true}) };
