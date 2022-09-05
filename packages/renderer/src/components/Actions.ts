const actions = async (otype: string, opayload: any) => {
  if (otype === 'wled') {
    const call = await fetch(opayload)
    call && console.log("wled", call)
  }
  else if (otype === 'http') {
    const call = await fetch(opayload)
    call && console.log("http", call)
  }
  else if (otype === 'speak') {
    speechHandler(spk, opayload)
  }
  else {
    alert(opayload)
  }
}

const spk = new SpeechSynthesisUtterance()

const speechHandler = (spk: SpeechSynthesisUtterance, text: string) => {
  spk.text = text
  window.speechSynthesis.speak(spk)
}

export default actions