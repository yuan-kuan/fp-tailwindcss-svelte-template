//
import daggy from 'daggy';
import { Future, resolve } from 'fluture';
import * as R from 'ramda';
import { writable } from 'svelte/store';

import * as free from './free';
import { registerDerefInterpretor } from './sop';

const createRef = (defaultValue) => {
  const { subscribe, set: originalSet } = writable(defaultValue);

  let owner = -1;
  let hotValue = defaultValue;

  function refset(sopId, newValue) {
    if (verifyOwnership(sopId)) {
      changeOwner(sopId);
      set(newValue);
      originalSet(newValue);
    } else {
      console.log('outdated update for sop ' + sopId);
    }
  }

  function reset(sopId) {
    if (verifyOwnership(sopId)) {
      changeOwner(sopId);
      set(defaultValue);
      originalSet(defaultValue);
    } else {
      console.log('outdated reset for sop ' + sopId);
    }
  }

  const verifyOwnership = (sopId) => sopId >= owner;

  function changeOwner(sopId) {
    if (sopId >= owner) {
      owner = sopId;
    } else {
      console.log(
        'Cannot change owner because someone with higher SOP ID already own this ref'
      );
    }
  }

  function set(value) {
    hotValue = value;

    // Bug, see DEVLOG Wed Mar 31 15:42:44 MYT 2021
    // originalSet(defaultValue);
  }

  const refget = (sopId) => {
    if (verifyOwnership(sopId)) {
      return hotValue;
    } else {
      console.log('outdated hot value get for sop ' + sopId);
      throw new Error('Outdated Get');
    }
  };

  return {
    subscribe,
    set,
    refget,
    refset,
    reset,
    verifyOwnership,
    changeOwner,
  };
};

function createArrayRef() {
  const {
    subscribe,
    refset: originalRefset,
    reset: originalReset,
    verifyOwnership,
    changeOwner,
  } = createRef([]);

  let data = [];

  const refset = (sopId, value) => {
    if (verifyOwnership(sopId)) {
      if (!Array.isArray(value)) {
        throw new Error('createArrayRef only accept Array');
      } else {
        data = R.clone(value);
        originalRefset(sopId, R.clone(data));
      }
    } 
  }

  const append = (sopId, value) => {
    if (verifyOwnership(sopId)) {
      data = data.concat(value);
      originalRefset(sopId, R.clone(data));
    }
  }

  function update(sopId, index, value) {
    if (verifyOwnership(sopId)) {
      data[index] = value;
      originalRefset(sopId, R.clone(data));
    }
  }

  const reset = (sopId) => {
    if (verifyOwnership(sopId)) {
      data = [];
      originalRefset(sopId, R.clone(data));
    }
  };

  return {
    subscribe,
    refset,
    append,
    update,
    reset,
    changeOwner,
  };
}

const Ref = daggy.taggedSum('Ref', {
  Deref: [''],
  Get: ['ref'],
  Reset: ['ref'],
  Set: ['ref', 'value'],
  Update: ['ref', 'key', 'value'],
  Append: ['ref', 'value']
});
// @ts-ignore
const { Deref, Get, Set, Reset, Update, Append } = Ref;

const refToFuture = (deref) => (p) =>
  p.cata({
    Deref: (_) => resolve(deref),
    Get: (ref) =>
      Future((reject, resolve) => {
        try {
          resolve(deref(ref).get());
        } catch (error) {
          reject(error);
        }

        return () => { };
      }),
    Set: (ref, value) =>
      Future((reject, resolve) => {
        try {
          // console.log('setting ', value);
          deref(ref).set(value);
          resolve();
        } catch (error) {
          reject(error);
        }
        return () => { };
      }),
    Reset: (ref) =>
      Future((reject, resolve) => {
        try {
        deref(ref).reset();
        resolve();

        } catch (error) {
          reject(error);
        }
        return () => { };
      }),
    Update: (ref, key, value) =>
      Future((reject, resolve) => {
        try {
        deref(ref).update(key, value);
        resolve();

        } catch (error) {
          reject(error);
        }
        return () => { };
      }),
    Append: (ref, value) =>
      Future((reject, resolve) => {
        try {
        deref(ref).append(value);
        resolve();

        } catch (error) {
          reject(error);
        }
        return () => { };
      }),
  });

const refInterpretor = (deref) => [Ref, refToFuture(deref)];
registerDerefInterpretor(refInterpretor);

const deref = () => free.lift(Deref(null));
const getRef = (ref) => free.lift(Get(ref));

const setRef = R.curry((ref, value) => free.lift(Set(ref, value)));
const updateRef = R.curry((ref, index, value) =>
  free.lift(Update(ref, index, value))
);
const appendRef = R.curry((ref, value) => free.lift(Append(ref, value)));
const resetRef = (ref) => free.lift(Reset(ref));

export {
  createRef,
  createArrayRef,
  refInterpretor,
  deref,
  getRef,
  setRef,
  updateRef,
  appendRef,
  resetRef,
};
