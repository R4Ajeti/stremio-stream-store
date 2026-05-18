const ManifestElement = document.getElementById('manifestUrl')
ManifestElement.textContent = `${window.location.origin}/manifest.json`

async function SubmitJson(PathStr, PayloadObj, ResultIdStr) {
  const ResultElement = document.getElementById(ResultIdStr)
  ResultElement.textContent = 'Saving...'
  ResultElement.className = ''

  try {
    const ResponseObj = await fetch(PathStr, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(PayloadObj),
    })

    const DataObj = await ResponseObj.json()
    ResultElement.textContent = JSON.stringify(DataObj, null, 2)
    ResultElement.className = ResponseObj.ok ? 'success' : 'error'
  } catch (ErrorObj) {
    ResultElement.textContent = ErrorObj instanceof Error ? ErrorObj.message : 'Unexpected error'
    ResultElement.className = 'error'
  }
}

document.getElementById('movieForm').addEventListener('submit', async (EventObj) => {
  EventObj.preventDefault()

  const FormDataObj = new FormData(EventObj.target)

  await SubmitJson('/api/link/movie', {
    imdbId: FormDataObj.get('imdbId'),
    url: FormDataObj.get('url'),
  }, 'movieResult')
})

document.getElementById('serieForm').addEventListener('submit', async (EventObj) => {
  EventObj.preventDefault()

  const FormDataObj = new FormData(EventObj.target)

  await SubmitJson('/api/link/serie', {
    imdbId: FormDataObj.get('imdbId'),
    season: Number(FormDataObj.get('season')),
    episode: Number(FormDataObj.get('episode')),
    url: FormDataObj.get('url'),
  }, 'serieResult')
})
