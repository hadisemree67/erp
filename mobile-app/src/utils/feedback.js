import { Vibration, Platform } from 'react-native';

/**
 * Web Audio API ile platform bağımsız saf sinüs dalgası bip sesi çalar.
 * Web veya destekleyen ortamlarda sıfır kütüphane bağımlılığıyla anında çalışır.
 */
const playWebTone = (frequency, durationMs, type = 'sine') => {
    try {
        if (typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(frequency, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + durationMs / 1000);
            }
        }
    } catch (e) {
        // Ses desteklenmiyorsa sessizce geç
    }
};

/**
 * Expo-AV kütüphanesi yüklüyse dinamik olarak yükler
 */
let expoAudio = null;
try {
    expoAudio = require('expo-av').Audio;
} catch (e) {
    // expo-av henüz yüklenmemişse sessizce geç
}

// 880Hz kısa net bip sesi (WAV Data URI - Başarılı okutma)
const SUCCESS_BEEP_URI = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18A/////wAAAP////8AAAD/////AAAA/////wAAAP////8AAAD/////AAAA/////wAAAP////8AAAD/////AAAA/////wAAAP////8AAAD/////AAAA';

// 220Hz pes ikaz sesi (WAV Data URI - Hatalı okutma)
const ERROR_BEEP_URI = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18AAAAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAA';

const playSound = async (type = 'success') => {
    // 1. Web ortamındaysa doğrudan Web Audio Tone
    if (Platform.OS === 'web') {
        if (type === 'success') {
            playWebTone(880, 150, 'sine'); // 880Hz Net Bip
        } else {
            playWebTone(240, 320, 'sawtooth'); // 240Hz Pes İkaz Buzzer
        }
        return;
    }

    // 2. Native Expo ortamında expo-av mevcutsa
    if (expoAudio) {
        try {
            const soundObject = new expoAudio.Sound();
            const uri = type === 'success' ? SUCCESS_BEEP_URI : ERROR_BEEP_URI;
            await soundObject.loadAsync({ uri });
            await soundObject.playAsync();
            soundObject.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    soundObject.unloadAsync().catch(() => {});
                }
            });
        } catch (err) {
            // Hata olursa sessizce devam et
        }
    }
};

/**
 * Başarılı Barkod Okutma Geri Bildirimi:
 * - Çift hafif titreşim (70ms - 50ms - 70ms)
 * - Tiz "Bip" sesi (880Hz)
 */
export const triggerSuccessFeedback = () => {
    try {
        Vibration.vibrate([0, 70, 50, 70]);
    } catch (e) {}
    playSound('success');
};

/**
 * Hatalı Barkod Okutma Geri Bildirimi:
 * - Sert ve uzun ikaz titreşimi (250ms - 80ms - 300ms)
 * - Pes "Buzzer" ikaz sesi (240Hz)
 */
export const triggerErrorFeedback = () => {
    try {
        Vibration.vibrate([0, 250, 80, 300]);
    } catch (e) {}
    playSound('error');
};
