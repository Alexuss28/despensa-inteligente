#!/usr/bin/env bash
# Configuración única para que GitHub Actions opere en Google Cloud
# sin claves (Workload Identity Federation).
#
# Ejecutar UNA vez en Cloud Shell, con el proyecto de la aplicación
# seleccionado:
#   bash infra/configurar-gcp.sh
#
# Es idempotente: si algo ya existe, lo deja como está.
#
# Crea:
#   - La cuenta de servicio github-operaciones, con los permisos justos:
#     Secret Manager, despliegue en Cloud Run y Cloud Scheduler.
#   - El grupo de identidades "github" y el proveedor "despensa-repo",
#     que SOLO acepta el flujo operaciones-gcp.yml de la rama main
#     de este repositorio.
set -euo pipefail

REPO="Isra393/despensa-inteligente"
REPO_ID="1415924010"
FLUJO=".github/workflows/operaciones-gcp.yml"
REGION="europe-west1"
SERVICIO="despensa-inteligente"
CUENTA="github-operaciones"
GRUPO="github"
PROVEEDOR="despensa-repo"

PROYECTO="$(gcloud config get-value project 2>/dev/null)"

if [[ -z "${PROYECTO}" ]]; then
  echo "Selecciona antes el proyecto: gcloud config set project <ID>" >&2
  exit 1
fi

NUMERO="$(gcloud projects describe "${PROYECTO}" --format='value(projectNumber)')"
CUENTA_EMAIL="${CUENTA}@${PROYECTO}.iam.gserviceaccount.com"

echo "Proyecto: ${PROYECTO} (${NUMERO})"

if [[ "${NUMERO}" != "599179699590" ]]; then
  echo "Aviso: el número de proyecto no coincide con el de la URL de Cloud Run (599179699590)." >&2
  read -r -p "¿Continuar de todos modos? [s/N] " respuesta
  [[ "${respuesta}" == "s" ]] || exit 1
fi

echo "1/6 Activando las APIs necesarias..."
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  cloudscheduler.googleapis.com

echo "2/6 Cuenta de servicio ${CUENTA_EMAIL}..."
if ! gcloud iam service-accounts describe "${CUENTA_EMAIL}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${CUENTA}" \
    --display-name="GitHub Actions: operaciones de Despensa Inteligente"
fi

echo "3/6 Permisos de la cuenta de servicio..."
for rol in roles/secretmanager.admin roles/run.developer roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding "${PROYECTO}" \
    --member="serviceAccount:${CUENTA_EMAIL}" \
    --role="${rol}" \
    --condition=None \
    --quiet >/dev/null
done

# Para desplegar revisiones de Cloud Run hay que poder "actuar como"
# la cuenta de servicio con la que se ejecuta el servicio.
CUENTA_RUN="$(gcloud run services describe "${SERVICIO}" \
  --region="${REGION}" \
  --format='value(spec.template.spec.serviceAccountName)')"
CUENTA_RUN="${CUENTA_RUN:-${NUMERO}-compute@developer.gserviceaccount.com}"

gcloud iam service-accounts add-iam-policy-binding "${CUENTA_RUN}" \
  --member="serviceAccount:${CUENTA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet >/dev/null

echo "4/6 Grupo de identidades \"${GRUPO}\"..."
if ! gcloud iam workload-identity-pools describe "${GRUPO}" \
  --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${GRUPO}" \
    --location=global \
    --display-name="GitHub Actions"
fi

echo "5/6 Proveedor \"${PROVEEDOR}\" (solo ${REPO}, rama main, flujo de operaciones)..."
CONDICION="assertion.repository_id == '${REPO_ID}' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref.startsWith('${REPO}/${FLUJO}@')"

if ! gcloud iam workload-identity-pools providers describe "${PROVEEDOR}" \
  --location=global --workload-identity-pool="${GRUPO}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVEEDOR}" \
    --location=global \
    --workload-identity-pool="${GRUPO}" \
    --display-name="Repositorio despensa-inteligente" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref" \
    --attribute-condition="${CONDICION}"
fi

echo "6/6 Permitir que ese flujo use la cuenta de servicio..."
gcloud iam service-accounts add-iam-policy-binding "${CUENTA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${NUMERO}/locations/global/workloadIdentityPools/${GRUPO}/attribute.repository_id/${REPO_ID}" \
  --quiet >/dev/null

cat <<FIN

Configuración terminada. Copia estos tres valores y pásaselos a Claude
(no son secretos):

  PROYECTO_ID:  ${PROYECTO}
  PROVEEDOR:    projects/${NUMERO}/locations/global/workloadIdentityPools/${GRUPO}/providers/${PROVEEDOR}
  CUENTA:       ${CUENTA_EMAIL}

FIN
