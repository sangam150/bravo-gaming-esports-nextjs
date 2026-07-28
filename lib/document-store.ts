export {
  COLLECTIONS,
  commitDocumentWriteOperations,
  createDocument,
  deleteDocument,
  fetchDocumentCollection,
  getConfiguredDataBackend,
  getDocument,
  isDocumentStoreAdminConfigured,
  isDocumentStoreConfigured,
  queryDocumentCollection,
  saveDocument,
  saveDocumentIfFieldsMatch,
} from "./supabase-document-runtime";
export { DocumentWriteConflictError } from "./supabase-document-runtime";
export type { DocumentWriteOperation } from "./supabase-document-runtime";
