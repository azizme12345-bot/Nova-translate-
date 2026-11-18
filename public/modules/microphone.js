let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let activeStream = null;

function showMicToast(message, isError = false) {
  let toast = document.getElementById('lafz-mic-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lafz-mic-toast';
    toast.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 18px;border-radius:12px;font-size:14px;z-index:9999;box-shadow:0 8px 20px rgba(0,0,0,0.25);transition:opacity 0.25s;text-align:center;max-width:90%;';
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? '#dc2626' : '#0f172a';
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 3500);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result || '';
      const base64 = result.toString().split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getSelectedSourceLanguage() {
  const select =
    document.getElementById('source-lang') ||
    document.getElementById('sourceLang') ||
    document.querySelector('select[data-role="source"]');
  if (select && select.options && select.selectedIndex >= 0) {
    return select.options[select.selectedIndex].text || select.value;
  }
  return 'Auto-detected language';
}

function insertTextAndTranslate(text) {
  const inputBox =
    document.getElementById('source-text') ||
    document.getElementById('sourceText') ||
    document.querySelector('textarea');

  if (!inputBox) return;

  const existing = inputBox.value.trim();
  inputBox.value = existing ? `${existing} ${text}` : text;

  // Input event trigger karein taake counter aur auto-translate chal pare
  inputBox.dispatchEvent(new Event('input', { bubbles: true }));
  inputBox.dispatchEvent(new Event('change', { bubbles: true }));

  // Translate button par click trigger karein agar auto-translate na chale
  const translateBtn =
    document.getElementById('translate-btn') ||
    document.getElementById('translateBtn') ||
    document.querySelector('button[type="submit"]');
  if (translateBtn) {
    setTimeout(() => translateBtn.click(), 100);
  }
}

function updateMicButtonUI(btn, recording, processing = false) {
  if (!btn) return;
  if (recording) {
    btn.classList.add('recording', 'active');
    btn.style.backgroundColor = '#ef4444';
    btn.style.color = '#ffffff';
  } else if (processing) {
    btn.classList.remove('recording');
    btn.style.backgroundColor = '#f59e0b';
    btn.style.color = '#ffffff';
  } else {
    btn.classList.remove('recording', 'active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  }
}

async function handleMicToggle(btn) {
  // Agar pehle se recording ho rahi hai to stop karein
  if (isRecording && mediaRecorder) {
    isRecording = false;
    updateMicButtonUI(btn, false, true);
    showMicToast('Awaz likhi ja rahi hai...');
    mediaRecorder.stop();
    return;
  }

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    mediaRecorder = new MediaRecorder(activeStream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
        activeStream = null;
      }

      try {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        if (audioBlob.size < 500) {
          updateMicButtonUI(btn, false, false);
          showMicToast('Awaz bohat choti thi, dobara bolein.', true);
          return;
        }

        const audioBase64 = await blobToBase64(audioBlob);
        const language = getSelectedSourceLanguage();

        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: mimeType.split(';')[0],
            language,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Transcription failed');
        }

        if (data.text) {
          insertTextAndTranslate(data.text);
          showMicToast('Mukammal!');
        } else {
          showMicToast('Koi awaz sunai nahi di.', true);
        }
      } catch (err) {
        console.error('Gemini STT Error:', err);
        showMicToast(err.message || 'Mic error aa gaya.', true);
      } finally {
        updateMicButtonUI(btn, false, false);
      }
    };

    mediaRecorder.start();
    isRecording = true;
    updateMicButtonUI(btn, true, false);
    showMicToast('Boliye... (Rokne ke liye dobara mic dabayein)');
  } catch (err) {
    console.error('Mic permission error:', err);
    isRecording = false;
    updateMicButtonUI(btn, false, false);
    showMicToast('Microphone ki ijazat (Permission) allow karein.', true);
  }
}

export function initMicrophone() {
  const micBtn =
    document.getElementById('mic-btn') ||
    document.getElementById('micBtn') ||
    document.getElementById('voice-btn') ||
    document.querySelector('[data-action="mic"], button[aria-label*="Speak" i], button[title*="Speak" i]');

  if (micBtn && !micBtn.dataset.geminiBound) {
    micBtn.dataset.geminiBound = 'true';
    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleMicToggle(micBtn);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMicrophone);
} else {
  initMicrophone();
}
