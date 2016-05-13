import { combineReducers } from 'redux';
import { applyFunctionMerging, setFuncNames } from '../symbolication';
import { defaultThreadOrder } from '../profile-data';

function status(state = 'INITIALIZING', action) {
  switch (action.type) {
    case 'WAITING_FOR_PROFILE_FROM_ADDON':
      return 'WAITING_FOR_PROFILE';
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return 'DONE';
    default:
      return state;
  }
}

function view(state = 'INITIALIZING', action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return 'PROFILE';
    default:
      return state;
  }
}

function threadOrder(state = [], action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return defaultThreadOrder(action.profile.threads);
    default:
      return state;
  }
}

function selectedThread(state = 0, action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return defaultThreadOrder(action.profile.threads)[0];
    case 'CHANGE_SELECTED_THREAD':
      return action.selectedThread;
    default:
      return state;
  }
}

function viewOptionsThreads(state = [], action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return action.profile.threads.map(thread => ({
        selectedFuncStack: [],
        expandedFuncStacks: [],
      }));
    case 'COALESCED_FUNCTIONS_UPDATE': {
      const { functionsUpdatePerThread } = action;
      return state.map((thread, threadIndex) => {
        if (!functionsUpdatePerThread[threadIndex]) {
          return thread;
        }
        const { oldFuncToNewFuncMap } = functionsUpdatePerThread[threadIndex];
        const selectedFuncStack = thread.selectedFuncStack.map(oldFunc => {
          const newFunc = oldFuncToNewFuncMap.get(oldFunc);
          return newFunc === undefined ? oldFunc : newFunc;
        });
        const expandedFuncStacks = thread.expandedFuncStacks.map(oldFuncArray => {
          return oldFuncArray.map(oldFunc => {
            const newFunc = oldFuncToNewFuncMap.get(oldFunc);
            return newFunc === undefined ? oldFunc : newFunc;
          });
        });
        return { selectedFuncStack, expandedFuncStacks };
      });
    }
    case 'CHANGE_SELECTED_FUNC_STACK': {
      const { selectedFuncStack, threadIndex } = action;
      return state.map((thread, ti) => {
        if (ti !== threadIndex) {
          return thread;
        }
        return Object.assign({}, thread, { selectedFuncStack });
      });
    }
    case 'CHANGE_EXPANDED_FUNC_STACKS': {
      const { threadIndex, expandedFuncStacks } = action;
      return state.map((thread, ti) => {
        if (ti !== threadIndex) {
          return thread;
        }
        return Object.assign({}, thread, { expandedFuncStacks });
      });
    }
    default:
      return state;
  }
}

function symbolicationStatus(state = 'DONE', action) {
  switch (action.type) {
    case 'START_SYMBOLICATING':
      return 'SYMBOLICATING';
    case 'DONE_SYMBOLICATING':
      return 'DONE';
    default:
      return state;
  }
}

function waitingForLibs(state = new Set(), action) {
  switch (action.type) {
    case 'REQUESTING_SYMBOL_TABLE': {
      const newState = new Set(state);
      newState.add(action.requestedLib);
      return newState;
    }
    case 'RECEIVED_SYMBOL_TABLE_REPLY': {
      const newState = new Set(state);
      newState.delete(action.requestedLib);
      return newState;
    }
    default:
      return state;
  }
}

function jsOnly(state = false, action) {
  switch (action.type) {
    case 'CHANGE_JS_ONLY':
      return action.jsOnly;
    default:
      return state;
  }
}

function invertCallstack(state = false, action) {
  switch (action.type) {
    case 'CHANGE_INVERT_CALLSTACK':
      return action.invertCallstack;
    default:
      return state;
  }
}

function profile(state = {}, action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_ADDON':
      return action.profile;
    case 'COALESCED_FUNCTIONS_UPDATE': {
      const { functionsUpdatePerThread } = action;
      const threads = state.threads.map((thread, threadIndex) => {
        if (!functionsUpdatePerThread[threadIndex])
          return thread;
        const { oldFuncToNewFuncMap, funcIndices, funcNames } = functionsUpdatePerThread[threadIndex];
        thread = applyFunctionMerging(thread, oldFuncToNewFuncMap);
        thread = setFuncNames(thread, funcIndices, funcNames);
        return thread;
      });
      return Object.assign({}, state, { threads });
    }
    default:
      return state;
  }
}

const viewOptions = combineReducers({
  threads: viewOptionsThreads,
  threadOrder, selectedThread, symbolicationStatus, waitingForLibs, jsOnly, invertCallstack,
});

const profileView = combineReducers({ viewOptions, profile });

export default combineReducers({ status, view, profileView });