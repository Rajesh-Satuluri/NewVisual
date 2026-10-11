// Cloud provider index (I39) — lazy-loads each provider dataset.
// Extended in Gate 5b (azure) and 5c (databricks).
const LOADERS = {
  aws: () => import('./aws.js').then(m => m.AWS),
  // azure: () => import('./azure.js').then(m => m.AZURE),      // Gate 5b
  // databricks: () => import('./databricks.js').then(m => m.DATABRICKS), // Gate 5c
};

export const CLOUD_PROVIDER_IDS = Object.keys(LOADERS);
export async function getProvider(id) { return LOADERS[id] ? await LOADERS[id]() : null; }
// 'aws07' -> 'aws', 'azure03' -> 'azure'
export function providerIdForModule(moduleId) { return moduleId.replace(/\d+$/, ''); }
export const isCloudModule = (id) => /^(aws|azure|databricks)\d{2}$/.test(id);
export const isCloudLanding = (id) => CLOUD_PROVIDER_IDS.includes(id);
