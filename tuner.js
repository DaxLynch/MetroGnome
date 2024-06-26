// tuner.js is in charge of breaking down the users audio signal and returning it to them to help accuractley tune their instrument
// Authors: Miles Anderson, Ryan Helms, Dax Lynch, and Harry Robertson
// Last Edited: 4/3/24

class Tuner {
    constructor(audioContext, pitchDisplayId) {
        this.audioContext = audioContext;
        this.pitchDisplay = document.getElementById(pitchDisplayId);
        this.centsDisplay = document.getElementById("cents-display");
        this.pendulum = document.getElementById("pendulum");
        this.isRunning = false;
        this.stream = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationFrameId = null;
    }

    initialize() {
        // Sets up the tuner class, and enables the "Start" button by initalizing an EventListener
        const toggleButton = document.getElementById('toggle-tuner');
        toggleButton.addEventListener('click', () => {
            if (this.isRunning) {
                this.stopTuner();
                toggleButton.textContent = 'Start Tuning';
            } else {
                this.startTuner();
                toggleButton.textContent = 'Stop Tuning';
            }
        });
    }

    startTuner() {
        // Starts the tuner and begins analyzing the audio input
        if (this.isRunning) return;
        this.isRunning = true;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.stream = stream;
                this.analyser = this.audioContext.createAnalyser();
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);

                this.analyser.minDecibels = -80;
                this.analyser.fftSize = 32768;
                this.analyser.smoothingTimeConstant = 0;

                const bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(bufferLength);

                this.updatePitchDisplay();
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
            });
    }

    stopTuner() {
        // Stops the tuner and sets it to an off state
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        cancelAnimationFrame(this.animationFrameId);
        this.pitchDisplay.textContent = '--';
        this.centsDisplay.textContent = '-';
        this.pendulum.style.transform = 'rotate(180deg)';
        this.pendulum.style.backgroundColor = 'black';
    }



    pitchClassAndCents(pitch) {
        // Converts the pitch input freq to a specific note and distance from note
        if (pitch === 0) { return ["--", 0]; }
        let pitchInOctave0 = pitch;
        while (pitchInOctave0 > 55.0) {
            pitchInOctave0 /= 2;
        }
        const pitches = [29.13523509488056, 30.867706328507698, 32.703195662574764, 34.647828872108946, 36.708095989675876, 38.890872965260044, 41.20344461410867, 43.65352892912541, 46.24930283895422, 48.99942949771858, 51.913087197493056, 55.0];
        const indexOfPitchAbove = pitches.findIndex(x => x > pitchInOctave0);
        if (indexOfPitchAbove === -1) {
            return ["--", 0];
        }
        const centsBelowNextNote = 1200.0 * Math.log2(pitchInOctave0 / pitches[indexOfPitchAbove]);
        const centsAbovePriorNote = 100.0 + centsBelowNextNote;
        const pitchClasses = ["A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A"];
        if (centsAbovePriorNote <= -1 * centsBelowNextNote) {
            const noteIndex = (indexOfPitchAbove - 1 + 12) % 12;
            return [pitchClasses[noteIndex], Math.round(centsAbovePriorNote)];
        } else {
            const noteIndex = indexOfPitchAbove;
            return [pitchClasses[noteIndex], Math.round(centsBelowNextNote)];
        }
    }

    updatePitchDisplay = () => {
        // Constant running function that uses pitchClassAndCents(pitch) to get the frequency then display it to the user
        if (!this.isRunning) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        const maxIndex = this.dataArray.indexOf(Math.max(...this.dataArray));
        const pitch = maxIndex * this.audioContext.sampleRate / this.analyser.fftSize;
        let [note, cents] = this.pitchClassAndCents(pitch);

        if (Math.abs(cents) <= 5) {
            cents = 0;
        }

        this.pitchDisplay.textContent = `${note}`;
        this.centsDisplay.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;


        const maxAngle = 60;
        const angle = ((cents / 50) * maxAngle) + 180;
        this.pendulum.style.transform = `rotate(${angle}deg)`;

        const redIntensity = Math.min(255, Math.abs(cents) * 5);
        const greenIntensity = Math.max(0, (255 - Math.abs(cents) * 5)+5);
        const color = `rgb(${redIntensity}, ${greenIntensity}, 0)`;
        this.pendulum.style.backgroundColor = color;
        this.pendulum.style.setProperty('--pendulum-color', color);

        this.animationFrameId = requestAnimationFrame(this.updatePitchDisplay);
    }
}