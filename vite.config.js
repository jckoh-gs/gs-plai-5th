import {defineConfig} from 'vite';
export default defineConfig({root:'web', build:{outDir:'../dist',emptyOutDir:true}, server:{proxy:{'/api':'http://127.0.0.1:3101','/samples':'http://127.0.0.1:3101'}}});
