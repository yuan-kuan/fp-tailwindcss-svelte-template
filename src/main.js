import App from './App.svelte';
import Sample from './Sample.svelte';

import { freeUtilsInterpretor } from './fp/free'; 
import { addSop, registerStaticInterpretor} from './fp/sop';
import { viewMainPage } from './view';

// Use Free Utils
registerStaticInterpretor(freeUtilsInterpretor);

addSop(() => viewMainPage(Sample));

// Kick start Svelte
const app = new App({
  target: document.body,
});

export default app;
