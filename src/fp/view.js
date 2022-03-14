import * as free from './fp/free';
import * as ref from './fp/ref';
import { addSop } from './fp/sop';

import {
  primaryView,
  modalView,
  closeModal
} from './App.svelte';

// Void -> Free SetRef
const closeModalSop = () => ref.setRef(modalView, '');

// Svelte Component -> Free
export const viewMainPage = (primaryView) => viewSubPage(primaryView, null);

// Svelte Component -> Svelte Component -> Function -> Free
export const viewSubPage = (primaryComponent, subComponent, subViewClosed) =>
  free.sequence([
    ref.setRef(primaryView, primaryComponent),
    ref.setRef(modalView, subComponent),
    ref.setRef(closeModal)(() => {
      addSop(() => closeModalSop());
      if (subViewClosed != undefined) subViewClosed();
    }),
  ]);
