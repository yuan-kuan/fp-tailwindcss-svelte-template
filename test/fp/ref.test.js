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

test('Setting a ref, svelte store react',  async () => {
  const singleValueStore = ref.createRef('test');
  const fn = jest.fn();
  singleValueStore.subscribe(fn);
  
  const fm = ref.setRef(singleValueStore, 'hello');
  await interpret(fm);

  // The first element of the array parameter of second call.
  // fn.mock.calls = [ ["test"], ["hello"] ]
  expect(fn.mock.calls[1][0]).toBe('hello');
});

test('Setting an array ref', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);
  
  const fm = ref.setRef(arrayStore, ['a', 'b']);
  await interpret(fm);

  expect(fn.mock.calls[1][0]).toEqual(['a', 'b']);
});

test('Append to empty array ref', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);
  
  const fm = free.sequence([
    ref.appendRef(arrayStore, ['c', 'd']),
  ]);
  await interpret(fm);

  expect(fn.mock.calls[1][0]).toEqual(['c', 'd']);
});

test('Append to exisitng array', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);
  
  const fm = free.sequence([
    ref.setRef(arrayStore, ['a', 'b']),
    ref.appendRef(arrayStore, ['c', 'd']),
  ]);
  interpret(fm);

  expect(fn.mock.calls[2][0]).toEqual(['a', 'b', 'c', 'd']);
});

test('Reset array', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);

  const fm = free.sequence([
    ref.setRef(arrayStore, ['a', 'b']),
    ref.appendRef(arrayStore, ['c', 'd']),
    ref.resetRef(arrayStore),
    ref.appendRef(arrayStore, ['e', 'f']),
  ]);
  await  interpret(fm);

  expect(fn.mock.calls[4][0]).toEqual(['e', 'f']);
});

test('Update array by the index', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);

  const fm = free.sequence([
    ref.setRef(arrayStore, ['a', 'b']),
    ref.updateRef(arrayStore, 1, 'c' )
  ]);
  await  interpret(fm);

  expect(fn.mock.calls[2][0]).toEqual(['a', 'c']);
});

test('Manipulating Array does nothing to prior setRef', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);

  let arr = ['a', 'b'];
  const fm = free.sequence([
    ref.setRef(arrayStore, arr).map((_) => arr.push('z')),
    ref.appendRef(arrayStore, ['c', 'd']),
  ]);
  await  interpret(fm);

  expect(fn.mock.calls[2][0]).toEqual(['a', 'b', 'c', 'd']);
});

test('Manipulating Array result does nothing too', (done) => {
  const arrayStore = ref.createArrayRef();
  arrayStore.subscribe(v => {
    if (v.length == 0) {
      //first time
      v.push('x');
    } else {
      //second time
      expect(v).toEqual(['a', 'b']);
      done();
    }
  });

  let arr = ['a', 'b'];
  const fm = free.sequence([
    ref.setRef(arrayStore, arr),
  ]);
  interpret(fm);
});

test('setRef a non-array should throw', async () => {
  const arrayStore = ref.createArrayRef();
  const fn = jest.fn();
  arrayStore.subscribe(fn);

  const fm = ref.setRef(arrayStore, {'type':'non-array'});

  expect(interpret(fm)).rejects.toEqual(Error('createArrayRef only accept Array')); 
});
