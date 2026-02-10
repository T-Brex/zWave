/**
 * Utility functions per gestire eventi input e prevenire comportamenti indesiderati
 */

export function createInputHandler(ref, onSubmit) {
  return {
    handleKeydown(event) {
      // Gestione Enter per inviare
      if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
        event.preventDefault();
        onSubmit();
        return;
      }
      
      // Gestione Backspace/Delete per prevenire comportamenti indesiderati
      if (event.key === 'Backspace' || event.key === 'Delete') {
        const currentValue = ref.value || '';
        if (currentValue.length === 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (ref.value !== '') {
            ref.value = '';
          }
          return false;
        }
        
        if (event.repeat) {
          event.stopPropagation();
        }
      }
      
      // Previeni comportamenti di navigazione del browser
      if (event.key === 'Backspace' && !event.target.matches('textarea, input')) {
        event.preventDefault();
      }
    },
    
    handleKeyup(event) {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        const currentValue = ref.value;
        if (currentValue === null || currentValue === undefined) {
          ref.value = '';
        } else if (typeof currentValue !== 'string') {
          ref.value = String(currentValue);
        }
        event.stopPropagation();
      }
    },
    
    handleInput(event) {
      const value = event?.target?.value ?? ref.value;
      if (value === null || value === undefined) {
        ref.value = '';
      } else {
        ref.value = String(value);
      }
    }
  };
}

export function createSearchHandler(ref) {
  return {
    handleKeydown(event) {
      if (event.key === 'Backspace' && !event.target.matches('textarea, input')) {
        event.preventDefault();
        return;
      }
      
      if ((event.key === 'Backspace' || event.key === 'Delete') && event.target.matches('input, textarea')) {
        const currentValue = ref.value || '';
        if (currentValue.length === 0 || (event.repeat && currentValue.length <= 1)) {
          if (ref.value !== '') {
            ref.value = '';
          }
          if (event.repeat && currentValue.length === 0) {
            event.stopPropagation();
          }
        }
      }
    },
    
    handleKeyup(event) {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        requestAnimationFrame(() => {
          const currentValue = ref.value;
          if (currentValue === null || currentValue === undefined) {
            ref.value = '';
          } else if (typeof currentValue !== 'string') {
            ref.value = String(currentValue);
          } else if (currentValue.length === 0) {
            ref.value = '';
          }
        });
      }
    },
    
    handleInput(event) {
      const value = event?.target?.value ?? ref.value;
      if (value === null || value === undefined) {
        ref.value = '';
      } else {
        const normalized = String(value);
        ref.value = normalized;
      }
    }
  };
}
