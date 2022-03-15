import { promise, resolve } from 'fluture';

import * as free from '../../src/fp/free';
import * as ref from '../../src/fp/ref';
import * as sop from '../../src/fp/sop';
import {dispatch} from '../../src/fp/interpretor';

const interpret = (freeMonad) => promise(
  freeMonad.foldMap(dispatch([
    free.freeUtilsInterpretor,
    ref.refInterpretor(sop.getDeref(1))
  ]), resolve));

test('Setting a ref, store react', (done) => {
  const singleValueStore = ref.createRef('test');
  singleValueStore.subscribe((v) => {
    if (v == 'test') return;

    expect(v).toBe('hello');
    done();
  });
  
  const fm = ref.setRef(singleValueStore, 'hello');
  interpret(fm);
});
