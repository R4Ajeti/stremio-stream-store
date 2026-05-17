const ManifestElement = document.getElementById('manifestUrl')
ManifestElement.textContent = `${window.location.origin}/manifest.json`

async function SubmitJson(path, payload, resultId) {
  const ResultElement = document.getElementById(resultId)

  try {
    const Headers = {
      'Content-Type': 'application/json',
    }

    const Response = await fetch(path, {
      method: 'POST',
      headers: Headers,
      body: JSON.stringify(payload),
    })

    const Data = await Response.json()
    ResultElement.textContent = JSON.stringify(Data, null, 2)
    ResultElement.className = Response.ok ? 'success' : 'error'
  } catch (ErrorObj) {
    ResultElement.textContent = ErrorObj instanceof Error ? ErrorObj.message : 'Unexpected error'
    ResultElement.className = 'error'
  }
}

document.getElementById('movieForm').addEventListener('submit', async (Event) => {
  Event.preventDefault()

  const FormDataObj = new FormData(Event.target)

  await SubmitJson('/api/link/movie', {
    imdbId: FormDataObj.get('imdbId'),
    url: FormDataObj.get('url'),
  }, 'movieResult')
})

document.getElementById('serieForm').addEventListener('submit', async (Event) => {
  Event.preventDefault()

  const FormDataObj = new FormData(Event.target)

  await SubmitJson('/api/link/serie', {
    imdbId: FormDataObj.get('imdbId'),
    season: Number(FormDataObj.get('season')),
    episode: Number(FormDataObj.get('episode')),
    url: FormDataObj.get('url'),
  }, 'serieResult')
})
