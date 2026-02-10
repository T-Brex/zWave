import { reactive, ref } from 'vue';
import { resolveCollectionKey } from '../utils/collectionResolver';

const FAQ_COLLECTION = 'faq';
const SITO_WEB_COLLECTION = 'sitoweb';
const FILE_COLLECTION = 'file';

export function useCollections(api) {
  const resolvedKeys = reactive({
    faq: null,
    sitoWeb: null,
    file: null,
  });

  async function initResolvedKeys() {
    resolvedKeys.faq = await resolveCollectionKey(api, FAQ_COLLECTION);
    resolvedKeys.sitoWeb = await resolveCollectionKey(api, SITO_WEB_COLLECTION);
    resolvedKeys.file = await resolveCollectionKey(api, FILE_COLLECTION);
  }

  return {
    resolvedKeys,
    initResolvedKeys,
    FAQ_COLLECTION,
    SITO_WEB_COLLECTION,
    FILE_COLLECTION,
  };
}
