import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { marked } from 'marked';
const MdPlugin=()=>({name:'local-markdown',transform(source,id){if(id.endsWith('.md'))return {code:'export const html = '+JSON.stringify(marked.parse(source))+';',map:null}}});
export default { plugins: [sveltekit(), MdPlugin({mode:'html'})], resolve:{alias:{$post:path.resolve('src/post'),'@images':path.resolve('src/images')}},build:{target:'es2020',assetsInlineLimit:0} };
