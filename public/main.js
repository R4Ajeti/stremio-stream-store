const ManifestElement = document.getElementById('manifestUrl')
const CopyManifestButton = document.getElementById('copyManifestButton')
const InstallButton = document.getElementById('installButton')
const ManifestStatusElement = document.getElementById('manifestStatus')
const WriteTokenInput = document.getElementById('writeTokenInput')
const RememberWriteTokenInput = document.getElementById('rememberWriteTokenInput')
const WriteTokenStorageKeyStr = 'stremio-stream-store-write-token'
const ImdbIdRegex = /^tt\d{7,10}$/
const ManifestUrlStr = `${window.location.origin}/manifest.json`
const StremioInstallUrlStr = ManifestUrlStr.replace(/^https?:\/\//, 'stremio://')

ManifestElement.textContent = ManifestUrlStr
InstallButton.href = StremioInstallUrlStr

const SavedWriteTokenStr = localStorage.getItem(WriteTokenStorageKeyStr) || ''

if (SavedWriteTokenStr) {
  WriteTokenInput.value = SavedWriteTokenStr
  RememberWriteTokenInput.checked = true
}

function SetManifestStatus(MessageStr, IsErrorBool = false) {
  ManifestStatusElement.textContent = MessageStr
  ManifestStatusElement.className = `inline-status ${IsErrorBool ? 'error-text' : 'success-text'}`
}

function GetWriteTokenStr() {
  return WriteTokenInput.value.trim()
}

function PersistWriteToken() {
  if (RememberWriteTokenInput.checked) {
    localStorage.setItem(WriteTokenStorageKeyStr, GetWriteTokenStr())
    return
  }

  localStorage.removeItem(WriteTokenStorageKeyStr)
}

function IsPrivateIpv4Address(HostnameStr) {
  const PartsArr = HostnameStr.split('.').map((PartStr) => Number(PartStr))

  if (PartsArr.length !== 4 || PartsArr.some((PartInt) => !Number.isInteger(PartInt) || PartInt < 0 || PartInt > 255)) {
    return false
  }

  const [FirstInt, SecondInt] = PartsArr

  return FirstInt === 10
    || FirstInt === 127
    || (FirstInt === 172 && SecondInt >= 16 && SecondInt <= 31)
    || (FirstInt === 192 && SecondInt === 168)
    || (FirstInt === 169 && SecondInt === 254)
    || FirstInt === 0
}

function ValidateStreamUrl(UrlStr) {
  try {
    const UrlObj = new URL(UrlStr)
    const HostnameStr = UrlObj.hostname.toLowerCase()

    if (!['http:', 'https:'].includes(UrlObj.protocol)) {
      return 'Stream URL must use http or https.'
    }

    if (HostnameStr === 'localhost' || HostnameStr.endsWith('.localhost') || HostnameStr === '::1' || HostnameStr === '[::1]') {
      return 'Stream URL cannot point to localhost.'
    }

    if (IsPrivateIpv4Address(HostnameStr)) {
      return 'Stream URL cannot point to a private network address.'
    }

    return ''
  } catch {
    return 'Stream URL must be a valid URL.'
  }
}

function ValidatePayload(PayloadObj) {
  if (!ImdbIdRegex.test(String(PayloadObj.imdbId || '').trim())) {
    return 'IMDb ID must look like tt1234567.'
  }

  if ('season' in PayloadObj && (!Number.isInteger(PayloadObj.season) || PayloadObj.season < 1)) {
    return 'Season must be a positive number.'
  }

  if ('episode' in PayloadObj && (!Number.isInteger(PayloadObj.episode) || PayloadObj.episode < 1)) {
    return 'Episode must be a positive number.'
  }

  return ValidateStreamUrl(String(PayloadObj.url || '').trim())
}

function SetResult(ResultElement, MessageElement, DataObj, IsOkBool, SuccessMessageStr) {
  ResultElement.textContent = JSON.stringify(DataObj, null, 2)
  ResultElement.className = IsOkBool ? 'success' : 'error'
  MessageElement.textContent = IsOkBool
    ? SuccessMessageStr
    : DataObj?.error?.message || 'Request failed.'
  MessageElement.className = `result-message ${IsOkBool ? 'success-text' : 'error-text'}`
}

async function SubmitJson(PathStr, PayloadObj, ResultIdStr, MessageIdStr, EntityLabelStr) {
  const ResultElement = document.getElementById(ResultIdStr)
  const MessageElement = document.getElementById(MessageIdStr)
  const ValidationMessageStr = ValidatePayload(PayloadObj)

  if (ValidationMessageStr) {
    SetResult(ResultElement, MessageElement, {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: ValidationMessageStr,
      },
    }, false, '')
    return
  }

  PersistWriteToken()

  ResultElement.textContent = 'Saving...'
  ResultElement.className = ''
  MessageElement.textContent = 'Saving...'
  MessageElement.className = 'result-message'

  try {
    const HeadersObj = {
      'Content-Type': 'application/json',
    }
    const WriteTokenStr = GetWriteTokenStr()

    if (WriteTokenStr) {
      HeadersObj.Authorization = `Bearer ${WriteTokenStr}`
    }

    const ResponseObj = await fetch(PathStr, {
      method: 'POST',
      headers: HeadersObj,
      body: JSON.stringify(PayloadObj),
    })

    const DataObj = await ResponseObj.json()
    const SuccessMessageStr = DataObj.wasCreated
      ? `${EntityLabelStr} link saved.`
      : `${EntityLabelStr} link replaced.`

    SetResult(ResultElement, MessageElement, DataObj, ResponseObj.ok, SuccessMessageStr)
  } catch (ErrorObj) {
    SetResult(ResultElement, MessageElement, {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: ErrorObj instanceof Error ? ErrorObj.message : 'Unexpected error',
      },
    }, false, '')
  }
}

WriteTokenInput.addEventListener('input', PersistWriteToken)
RememberWriteTokenInput.addEventListener('change', PersistWriteToken)

CopyManifestButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ManifestUrlStr)
    SetManifestStatus('Manifest URL copied.')
  } catch {
    SetManifestStatus('Copy failed. Select the URL and copy it manually.', true)
  }
})

document.getElementById('movieForm').addEventListener('submit', async (EventObj) => {
  EventObj.preventDefault()

  const FormDataObj = new FormData(EventObj.target)

  await SubmitJson('/api/link/movie', {
    imdbId: String(FormDataObj.get('imdbId') || '').trim(),
    url: String(FormDataObj.get('url') || '').trim(),
  }, 'movieResult', 'movieMessage', 'Movie')
})

document.getElementById('serieForm').addEventListener('submit', async (EventObj) => {
  EventObj.preventDefault()

  const FormDataObj = new FormData(EventObj.target)

  await SubmitJson('/api/link/serie', {
    imdbId: String(FormDataObj.get('imdbId') || '').trim(),
    season: Number(FormDataObj.get('season')),
    episode: Number(FormDataObj.get('episode')),
    url: String(FormDataObj.get('url') || '').trim(),
  }, 'serieResult', 'serieMessage', 'Episode')
})
