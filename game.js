/**
 * Hyperbaric Rescue - Game Logic
 * Manages game states, user inputs, interactive elements, and simulations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- GAME STATE ---
    const state = {
        score: 0,
        currentStage: 'intro',
        soundEnabled: false,
        
        // Triage State
        q1Answered: false,
        scanComplete: false,
        tcpo2Value: 0,
        targetTcPO2: 22, // Low TcPO2, representing ischemia
        
        // Prep State
        q2Answered: false,
        sugarMeasured: false,
        sugarValue: 112, // Initial unsafe sugar value
        sugarCorrected: false,
        q3Answered: false,
        
        // Simulator State
        diveDuration: 40, // 40 seconds duration
        timeRemaining: 40,
        pressureValue: 1.0,
        targetPressureMin: 2.0,
        targetPressureMax: 2.4,
        sugarSimValue: 178,
        o2Value: 100,
        simInterval: null,
        activeEvent: null, // 'ear' or 'hypo'
        eventTriggered: { ear: false, hypo: false },
        eventTimer: null,
        eventTimeLeft: 0,
        pressureScoreAcc: 0, // Accumulator for pressure scoring
    };

    // --- DOM ELEMENTS ---
    const elements = {
        // Core Layout
        gameHeader: document.getElementById('game-header'),
        stageTitle: document.getElementById('stage-title'),
        scoreVal: document.getElementById('score-val'),
        soundBtn: document.getElementById('sound-btn'),
        soundIconOn: document.getElementById('sound-icon-on'),
        soundIconOff: document.getElementById('sound-icon-off'),
        
        // Screens
        screenAuth: document.getElementById('screen-auth'),
        authCodeInput: document.getElementById('auth-code-input'),
        unlockBtn: document.getElementById('unlock-btn'),
        authErrorMsg: document.getElementById('auth-error-msg'),
        screenIntro: document.getElementById('screen-intro'),
        screenTriage: document.getElementById('screen-triage'),
        screenPrep: document.getElementById('screen-prep'),
        screenSimulator: document.getElementById('screen-simulator'),
        screenResults: document.getElementById('screen-results'),
        
        // Interactive Controls
        startBtn: document.getElementById('start-btn'),
        
        // Triage Screen
        q1Options: document.querySelectorAll('#q1-container .option-btn'),
        scannerAction: document.getElementById('scanner-action'),
        laserSensor: document.getElementById('laser-sensor'),
        scannerZone: document.querySelector('.scanner-zone'),
        footWound: document.getElementById('foot-wound'),
        scanFeedback: document.getElementById('scan-feedback'),
        tcpo2Val: document.getElementById('tcpo2-val'),
        tcpo2Explanation: document.getElementById('tcpo2-explanation'),
        toPrepBtn: document.getElementById('to-prep-btn'),
        
        // Prep Screen
        q2Options: document.querySelectorAll('#q2-container .option-btn'),
        testSugarBtn: document.getElementById('test-sugar-btn'),
        glucoVal: document.getElementById('gluco-val'),
        glucoMessage: document.getElementById('gluco-message'),
        glucoStrip: document.getElementById('gluco-strip'),
        glucoBloodSpot: document.getElementById('gluco-blood-spot'),
        glucoActionArea: document.getElementById('gluco-action-area'),
        glucoAlert: document.getElementById('gluco-alert'),
        giveJuiceBtn: document.getElementById('give-juice-btn'),
        giveInsulinBtn: document.getElementById('give-insulin-btn'),
        prepFeedback1: document.getElementById('prep-feedback-1'),
        toPrepPart2Btn: document.getElementById('to-prep-part2-btn'),
        
        prepQ1Section: document.getElementById('prep-q1-section'),
        prepQ2Section: document.getElementById('prep-q2-section'),
        q3Options: document.querySelectorAll('#q3-container .patient-card-option'),
        toDiveBtn: document.getElementById('to-dive-btn'),
        briefingOverlay: document.getElementById('briefing-overlay'),
        startDiveConfirmBtn: document.getElementById('start-dive-confirm-btn'),
        modalOverlay: document.getElementById('game-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalText: document.getElementById('modal-text'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        
        // Simulator Screen
        diveTimer: document.getElementById('dive-timer'),
        simO2: document.getElementById('sim-o2'),
        simSugar: document.getElementById('sim-sugar'),
        simPressure: document.getElementById('sim-pressure'),
        pressureSlider: document.getElementById('pressure-slider'),
        pressureNeedle: document.getElementById('pressure-needle'),
        simStatusDot: document.getElementById('sim-status-dot'),
        simStatusLbl: document.getElementById('sim-status-lbl'),
        simEventPanel: document.getElementById('sim-event-panel'),
        eventTitle: document.getElementById('event-title'),
        eventDesc: document.getElementById('event-desc'),
        eventActionBtn: document.getElementById('event-action-btn'),
        emergencyAbortBtn: document.getElementById('emergency-abort-btn'),
        patientBalloon: document.getElementById('patient-balloon'),
        
        // Results Screen
        finalAchievement: document.getElementById('final-achievement'),
        verificationCode: document.getElementById('verification-code'),
        copyCodeBtn: document.getElementById('copy-code-btn'),
        restartBtn: document.getElementById('restart-btn'),
    };

    // --- AUDIO TOGGLE ---
    elements.soundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        if (state.soundEnabled) {
            elements.soundIconOn.classList.remove('hidden');
            elements.soundIconOff.classList.add('hidden');
            gameAudio.setMute(false);
            gameAudio.playClick();
            
            // Resume hum if inside simulator
            if (state.currentStage === 'simulator' && !state.activeEvent) {
                gameAudio.startHum();
            }
        } else {
            elements.soundIconOn.classList.add('hidden');
            elements.soundIconOff.classList.remove('hidden');
            gameAudio.setMute(true);
        }
    });

    // --- ACCESS CODE VERIFICATION ---
    function verifyAccessCode() {
        const enteredCode = elements.authCodeInput.value.trim();
        gameAudio.init(); // Initialize audio context on unlock gesture
        
        if (enteredCode === '3434') {
            gameAudio.playSuccess();
            elements.authErrorMsg.classList.add('hidden');
            showScreen(elements.screenIntro);
        } else {
            gameAudio.playError();
            elements.authErrorMsg.classList.remove('hidden');
            elements.authCodeInput.classList.add('error-shake');
            elements.authCodeInput.value = '';
            
            setTimeout(() => {
                elements.authCodeInput.classList.remove('error-shake');
            }, 400);
        }
    }

    if (elements.unlockBtn && elements.authCodeInput) {
        elements.unlockBtn.addEventListener('click', verifyAccessCode);
        elements.authCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                verifyAccessCode();
            }
        });
    }

    // --- NAVIGATION HELPERS ---
    function updateScore(amount) {
        state.score += amount;
        if (state.score < 0) state.score = 0;
        elements.scoreVal.textContent = state.score;
    }

    function showScreen(screen) {
        // Hide all screens
        if (elements.screenAuth) elements.screenAuth.classList.add('hidden');
        elements.screenIntro.classList.add('hidden');
        elements.screenTriage.classList.add('hidden');
        elements.screenPrep.classList.add('hidden');
        elements.screenSimulator.classList.add('hidden');
        elements.screenResults.classList.add('hidden');
        
        // Show target screen
        screen.classList.remove('hidden');
        
        // Update stage configuration
        if (screen === elements.screenIntro || screen === elements.screenAuth) {
            state.currentStage = screen === elements.screenIntro ? 'intro' : 'auth';
            elements.gameHeader.classList.add('hidden');
        } else {
            elements.gameHeader.classList.remove('hidden');
            if (screen === elements.screenTriage) {
                state.currentStage = 'triage';
                elements.stageTitle.textContent = 'אבחון ומיון';
            } else if (screen === elements.screenPrep) {
                state.currentStage = 'prep';
                elements.stageTitle.textContent = 'הכנה ובטיחות';
            } else if (screen === elements.screenSimulator) {
                state.currentStage = 'simulator';
                elements.stageTitle.textContent = 'סימולטור תא לחץ';
            } else if (screen === elements.screenResults) {
                state.currentStage = 'results';
                elements.stageTitle.textContent = 'תוצאות הטיפול';
            }
        }
    }

    // --- CUSTOM GAME MODAL ---
    let modalCallback = null;
    function showGameModal(title, text, callback = null) {
        elements.modalTitle.textContent = title;
        elements.modalText.textContent = text;
        elements.modalOverlay.classList.remove('hidden');
        modalCallback = callback;
    }

    elements.modalCloseBtn.addEventListener('click', () => {
        elements.modalOverlay.classList.add('hidden');
        gameAudio.playClick();
        if (modalCallback) {
            const cb = modalCallback;
            modalCallback = null;
            cb();
        }
    });

    // --- GAME INTRO FLOW ---
    elements.startBtn.addEventListener('click', () => {
        // Initialize Audio Context on first click
        gameAudio.init();
        gameAudio.playClick();
        
        state.score = 0;
        updateScore(0);
        
        showScreen(elements.screenTriage);
    });

    // --- STAGE 1: TRIAGE / DIAGNOSIS ---
    elements.q1Options.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (state.q1Answered) return;
            
            state.q1Answered = true;
            const selectedOpt = btn.getAttribute('data-opt');
            
            // Record score quietly
            state.q1Score = (selectedOpt === '3') ? 30 : 0;
            updateScore(state.q1Score);
            
            // Highlight selected button neutrally
            btn.classList.add('selected');
            gameAudio.playClick();
            
            // Disable other options
            elements.q1Options.forEach(opt => {
                if (opt !== btn) opt.style.opacity = '0.6';
            });
            
            // Show Laser scanner interactive section immediately regardless of choice
            setTimeout(() => {
                elements.scannerAction.classList.remove('hidden');
                setupScannerDragging();
            }, 800);
        });
    });

    // TcPO2 Laser Scanner Touch & Mouse Drag Setup
    function setupScannerDragging() {
        let isDragging = false;
        let startX, startY;
        let sensorX = 20; // Initial left (from style.css)
        let sensorY = 20; // Initial top (from style.css)
        
        const sensor = elements.laserSensor;
        const container = elements.scannerZone;
        const wound = elements.footWound;
        
        sensor.addEventListener('pointerdown', (e) => {
            isDragging = true;
            sensor.setPointerCapture(e.pointerId);
            startX = e.clientX - sensorX;
            startY = e.clientY - sensorY;
            gameAudio.playClick();
            sensor.style.cursor = 'grabbing';
        });
        
        sensor.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            let x = e.clientX - startX;
            let y = e.clientY - startY;
            
            // Containment boundaries within container
            const maxLeft = container.clientWidth - sensor.clientWidth;
            const maxTop = container.clientHeight - sensor.clientHeight;
            
            if (x < 0) x = 0;
            if (x > maxLeft) x = maxLeft;
            if (y < 0) y = 0;
            if (y > maxTop) y = maxTop;
            
            sensorX = x;
            sensorY = y;
            
            sensor.style.left = `${sensorX}px`;
            sensor.style.top = `${sensorY}px`;
            
            // Check overlap with the wound
            const sensorRect = sensor.getBoundingClientRect();
            const woundRect = wound.getBoundingClientRect();
            
            // Center of sensor
            const sCenterX = sensorRect.left + sensorRect.width / 2;
            const sCenterY = sensorRect.top + sensorRect.height / 2;
            
            // Center of wound
            const wCenterX = woundRect.left + woundRect.width / 2;
            const wCenterY = woundRect.top + woundRect.height / 2;
            
            // Distance formula
            const dist = Math.sqrt(Math.pow(sCenterX - wCenterX, 2) + Math.pow(sCenterY - wCenterY, 2));
            
            if (dist < 40) { // Hovering over wound
                if (!container.classList.contains('scanning-active')) {
                    container.classList.add('scanning-active');
                    elements.scanFeedback.classList.remove('hidden');
                }
                
                // Play sonar scanner sound occasionally
                if (Math.random() < 0.15) {
                    gameAudio.playScan();
                }
                
                // Increment TcPO2 value
                if (state.tcpo2Value < state.targetTcPO2) {
                    state.tcpo2Value += 1;
                    elements.tcpo2Val.textContent = state.tcpo2Value;
                } else if (state.tcpo2Value === state.targetTcPO2 && !state.scanComplete) {
                    // Scanning Complete!
                    state.scanComplete = true;
                    container.classList.remove('scanning-active');
                    elements.scanFeedback.classList.add('hidden');
                    sensor.style.display = 'none'; // hide sensor
                    
                    gameAudio.playSuccess();
                    updateScore(20);
                    
                    // Display explanation
                    elements.tcpo2Explanation.innerHTML = `
                        <strong>תוצאה נמוכה! 22 mmHg</strong><br>
                        ערך תקין סביב כף הרגל הוא מעל 40 mmHg.
                        רמה של 22 mmHg מראה על איסכמיה מקומית חמורה (חוסר חמצן ברקמה). 
                        מצב זה מנבא כי פוטנציאל הריפוי הספונטני נמוך, אך מעיד על <strong>התאמה מצוינת לטיפול בתא לחץ</strong>, אשר יציף את הרקמות בחמצן ויעודד ריפוי!
                    `;
                    elements.tcpo2Explanation.classList.remove('hidden');
                    elements.toPrepBtn.classList.remove('hidden');
                }
            } else {
                container.classList.remove('scanning-active');
                elements.scanFeedback.classList.add('hidden');
            }
        });
        
        sensor.addEventListener('pointerup', (e) => {
            isDragging = false;
            sensor.style.cursor = 'grab';
            container.classList.remove('scanning-active');
            elements.scanFeedback.classList.add('hidden');
        });
        
        sensor.addEventListener('pointercancel', () => {
            isDragging = false;
            container.classList.remove('scanning-active');
            elements.scanFeedback.classList.add('hidden');
        });
    }

    elements.toPrepBtn.addEventListener('click', () => {
        gameAudio.playClick();
        showScreen(elements.screenPrep);
    });

    // --- STAGE 2: PREPARATION & SAFETY ---
    
    // Part 1: Targets (Q2)
    elements.q2Options.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.q2Answered) return;
            
            state.q2Answered = true;
            const selectedOpt = btn.getAttribute('data-opt');
            
            // Record score quietly
            state.q2Score = (selectedOpt === '3') ? 30 : 0;
            updateScore(state.q2Score);
            
            // Highlight selected button neutrally
            btn.classList.add('selected');
            gameAudio.playClick();
            
            // Disable other options
            elements.q2Options.forEach(opt => {
                if (opt !== btn) opt.style.opacity = '0.6';
            });
            
            // Enable test button
            elements.testSugarBtn.disabled = false;
        });
    });

    // Glucometer Blood sugar measurement simulation
    elements.testSugarBtn.addEventListener('click', () => {
        if (state.sugarMeasured) return;
        
        elements.testSugarBtn.disabled = true;
        gameAudio.playBeep(800, 'sine', 0.1, 0.08);
        
        // Step 1: Slide strip down
        elements.glucoMessage.textContent = "סטיק מוכנס...";
        elements.glucoStrip.classList.add('inserted');
        
        // Step 2: Apply Blood
        setTimeout(() => {
            elements.glucoMessage.textContent = "הזן דם";
            gameAudio.playBeep(900, 'sine', 0.15, 0.08);
        }, 800);

        // Step 3: Blood spot absorbs
        setTimeout(() => {
            elements.glucoBloodSpot.classList.add('active');
            elements.glucoMessage.textContent = "בודק...";
            gameAudio.playBeep(1000, 'sine', 0.1, 0.08);
        }, 1800);

        // Step 4: LCD analysis flashing countdown
        let count = 0;
        let scanInterval;
        setTimeout(() => {
            scanInterval = setInterval(() => {
                elements.glucoVal.textContent = Math.floor(Math.random() * 200 + 40);
                count++;
                if (count > 8) {
                    clearInterval(scanInterval);
                    
                    // Finalize low sugar measurement
                    state.sugarMeasured = true;
                    elements.glucoVal.textContent = state.sugarValue;
                    elements.glucoVal.style.color = '#ff9f0a'; // warning orange
                    elements.glucoMessage.textContent = "סוכר נמוך";
                    
                    gameAudio.playSuccess();
                    
                    // Reveal corrective action controls
                    elements.glucoActionArea.classList.remove('hidden');
                    elements.giveJuiceBtn.disabled = false;
                    elements.giveInsulinBtn.disabled = false;
                }
            }, 120);
        }, 2200);
    });

    // Glucometer actions
    function resolveGlucoAction(action) {
        if (state.sugarCorrected) return;
        state.sugarCorrected = true;
        
        const feedbackText = document.getElementById('prep-feedback-1-text');
        
        elements.glucoAlert.classList.add('hidden');
        elements.giveJuiceBtn.disabled = true;
        elements.giveInsulinBtn.disabled = true;
        
        gameAudio.playClick();
        
        if (action === 'juice') {
            state.sugarValue = 178;
            state.sugarSimValue = 178;
            state.sugarActionScore = 20;
            
            elements.giveJuiceBtn.classList.add('selected');
            elements.glucoVal.textContent = state.sugarValue;
            elements.glucoVal.style.color = '#05ff7b'; // Safe green
            elements.glucoMessage.textContent = "תקין";
            
            feedbackText.innerHTML = "נתת ליוסי פחמימות זמינות. רמת הסוכר עודכנה ל-<strong>178 mg/dL</strong>.";
        } else {
            state.sugarValue = 62;
            state.sugarSimValue = 62;
            state.sugarActionScore = 0; // Dangerous action
            
            elements.giveInsulinBtn.classList.add('selected');
            elements.glucoVal.textContent = state.sugarValue;
            elements.glucoVal.style.color = '#ff375f'; // Alarm red
            elements.glucoMessage.textContent = "סכנה";
            
            feedbackText.innerHTML = "הזרקת ליוסי אינסולין. רמת הסוכר עודכנה ל-<strong>62 mg/dL</strong>.";
        }
        
        updateScore(state.sugarActionScore);
        elements.prepFeedback1.classList.remove('hidden');
    }

    elements.giveJuiceBtn.addEventListener('click', () => resolveGlucoAction('juice'));
    elements.giveInsulinBtn.addEventListener('click', () => resolveGlucoAction('insulin'));

    elements.toPrepPart2Btn.addEventListener('click', () => {
        gameAudio.playClick();
        elements.prepQ1Section.classList.add('hidden');
        elements.prepQ2Section.classList.remove('hidden');
    });

    // Part 2: Patient selection (Q3)
    elements.q3Options.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.q3Answered) return;
            
            state.q3Answered = true;
            const selectedOpt = btn.getAttribute('data-opt');
            
            // Record score quietly
            state.q3Score = (selectedOpt === 'b') ? 30 : 0;
            updateScore(state.q3Score);
            
            // Highlight card neutrally
            btn.classList.add('selected');
            gameAudio.playClick();
            
            // Disable other options
            elements.q3Options.forEach(opt => {
                if (opt !== btn) opt.style.opacity = '0.6';
            });
            
            // Proceed to Simulator immediately
            setTimeout(() => {
                elements.toDiveBtn.classList.remove('hidden');
            }, 800);
        });
    });

    elements.toDiveBtn.addEventListener('click', () => {
        gameAudio.playClick();
        showScreen(elements.screenSimulator);
        elements.briefingOverlay.classList.remove('hidden');
    });

    elements.startDiveConfirmBtn.addEventListener('click', () => {
        gameAudio.playClick();
        elements.briefingOverlay.classList.add('hidden');
        startSimulation();
    });

    // --- STAGE 3: CHAMBER SIMULATOR ---
    function updatePressureNeedle(val) {
        // Map pressure [1.0 to 3.0] to angle [-90deg to +90deg]
        const angle = -90 + ((val - 1.0) / 2.0) * 180;
        elements.pressureNeedle.style.transform = `rotate(${angle}deg)`;
    }

    function startSimulation() {
        // Start background sound hum
        if (state.soundEnabled) {
            gameAudio.startHum();
        }
        
        state.timeRemaining = state.diveDuration;
        state.pressureValue = 1.0;
        elements.pressureSlider.value = 1.0;
        updatePressureNeedle(1.0);
        
        elements.simPressure.textContent = '1.0 ATA';
        elements.simSugar.textContent = `${state.sugarSimValue} mg/dL`;
        elements.simO2.textContent = '100%';
        
        state.eventTriggered.ear = false;
        state.eventTriggered.hypo = false;
        state.activeEvent = null;
        
        // Game simulation clock (1 second intervals)
        state.simInterval = setInterval(() => {
            state.timeRemaining--;
            
            // Update clock display
            const mins = Math.floor(state.timeRemaining / 60);
            const secs = state.timeRemaining % 60;
            elements.diveTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            // Slowly decrease blood sugar simulated levels due to HBOT effect
            if (!state.activeEvent || state.activeEvent !== 'hypo') {
                // decrease by 0.8 mg/dl per second under pressure
                state.sugarSimValue = Math.max(30, Math.floor(state.sugarValue - (40 - state.timeRemaining) * 0.8));
                elements.simSugar.textContent = `${state.sugarSimValue} mg/dL`;
            }
            
            // Read slider value
            const currentSlider = parseFloat(elements.pressureSlider.value);
            state.pressureValue = currentSlider;
            elements.simPressure.textContent = `${state.pressureValue.toFixed(2)} ATA`;
            updatePressureNeedle(state.pressureValue);
            
            // Pressure tracking check
            checkPressureStability();
            
            // Trigger Random Events at fixed times
            if (state.timeRemaining === 32 && !state.eventTriggered.ear) {
                triggerEarEvent();
            }
            // Trigger hypo event at 18 seconds for normal state OR immediately if sugar drops below 50
            if ((state.timeRemaining === 18 || state.sugarSimValue < 50) && !state.eventTriggered.hypo) {
                triggerHypoEvent();
            }
            
            // End of Simulation
            if (state.timeRemaining <= 0) {
                endSimulation(true);
            }
        }, 1000);
        
        // Real-time loop for smoother UI sliders (50ms interval)
        state.uiLoop = setInterval(() => {
            const currentSlider = parseFloat(elements.pressureSlider.value);
            if (Math.abs(state.pressureValue - currentSlider) > 0.01) {
                state.pressureValue = currentSlider;
                elements.simPressure.textContent = `${state.pressureValue.toFixed(2)} ATA`;
                updatePressureNeedle(state.pressureValue);
            }
        }, 50);
    }

    function checkPressureStability() {
        if (state.activeEvent) return; // ignore standard scoring during active emergencies
        
        const p = state.pressureValue;
        if (p >= state.targetPressureMin && p <= state.targetPressureMax) {
            // Perfect pressure
            elements.simStatusDot.className = 'status-indicator-green';
            elements.simStatusLbl.textContent = 'סטטוס: טיפול תקין - לחץ אופטימיל';
            elements.simStatusLbl.className = 'text-green';
            
            // Accumulate scoring
            state.pressureScoreAcc += 0.5;
            if (state.pressureScoreAcc >= 1) {
                updateScore(1);
                state.pressureScoreAcc = 0;
            }
        } else if (p < state.targetPressureMin) {
            // Low pressure
            elements.simStatusDot.className = 'status-indicator-green'; // keep green but warning text
            elements.simStatusDot.style.backgroundColor = '#ff9f0a';
            elements.simStatusDot.style.boxShadow = '0 0 8px #ff9f0a';
            elements.simStatusLbl.textContent = 'סטטוס: לחץ נמוך מדי. טיפול אינו יעיל.';
            elements.simStatusLbl.className = 'text-orange';
        } else {
            // High pressure
            elements.simStatusDot.className = 'status-indicator-red';
            elements.simStatusLbl.textContent = 'סטטוס: לחץ גבוה מדי! סכנת רעילות חמצן.';
            elements.simStatusLbl.className = 'text-red';
            
            // Lose points for high pressure trauma danger
            updateScore(-1);
        }
    }

    // EVENT 1: Ear Pressure Pain
    function triggerEarEvent() {
        state.eventTriggered.ear = true;
        state.activeEvent = 'ear';
        
        // Visual effects
        elements.patientBalloon.textContent = "איי! כואב לי באוזניים!";
        elements.patientBalloon.classList.remove('hidden');
        elements.simStatusDot.className = 'status-indicator-red';
        
        // Show control panel warning
        elements.eventTitle.textContent = "אירוע: לחץ באוזניים (Barotrauma)";
        elements.eventDesc.textContent = "עקב שינוי לחץ, המטופל חש כאב עז באוזניים ומתקשה בהשוואת לחצים. כיצד תנחה אותו?";
        elements.eventActionBtn.textContent = "הורה למטופל לבצע פעולת פימפום (Valsalva)";
        elements.eventActionBtn.className = "btn btn-accent btn-block";
        elements.emergencyAbortBtn.classList.add('hidden');
        elements.simEventPanel.classList.remove('hidden');
        
        // Start alarm sound
        if (state.soundEnabled) {
            gameAudio.startAlarm();
        }
        
        // Event timer (must resolve in 6 seconds)
        state.eventTimeLeft = 6;
        state.eventTimer = setInterval(() => {
            state.eventTimeLeft--;
            if (state.eventTimeLeft <= 0) {
                // Failure to resolve in time
                resolveEarEvent(false);
            }
        }, 1000);
    }

    // Resolve Ear event
    elements.eventActionBtn.addEventListener('click', () => {
        if (state.activeEvent === 'ear') {
            resolveEarEvent(true);
        } else if (state.activeEvent === 'hypo') {
            resolveHypoEvent(true);
        }
    });

    function resolveEarEvent(success) {
        clearInterval(state.eventTimer);
        gameAudio.stopAlarm();
        
        elements.patientBalloon.classList.add('hidden');
        elements.simEventPanel.classList.add('hidden');
        state.activeEvent = null;
        
        if (success) {
            gameAudio.playSuccess();
            updateScore(15);
            showGameModal("השוואת לחצים מוצלחת", "המטופל פימפם בהצלחה (שיטת ולסלבה) והשוואה את הלחצים באוזן התיכונה. הלחץ חזר לרמה נוחה.");
        } else {
            gameAudio.playError();
            updateScore(-15);
            showGameModal("השוואת לחצים נכשלה", "לא הגבת בזמן. המטופל סבל מכאבי אוזניים עזים, מה שאילץ אותך להאט את קצב עליית הלחץ. נגרם נזק קל לעור התוף (Barotrauma).");
        }
    }

    // EVENT 2: Hypoglycemia Crisis
    function triggerHypoEvent() {
        state.eventTriggered.hypo = true;
        state.activeEvent = 'hypo';
        
        // Visual effects
        elements.patientBalloon.textContent = "אני מזיע ומרגיש חלש מאוד...";
        elements.patientBalloon.classList.remove('hidden');
        elements.simStatusDot.className = 'status-indicator-red';
        
        // Display dropping sugar values
        state.sugarSimValue = 48;
        elements.simSugar.textContent = `${state.sugarSimValue} mg/dL`;
        elements.simSugar.classList.add('text-red');
        
        // Show control panel warning
        elements.eventTitle.textContent = "חירום: היפוגליקמיה קיצונית בתא!";
        elements.eventDesc.textContent = "רמת הסוכר של המטופל קרסה ל-48 mg/dL. הוא בהכרה אך מבולבל ומזיע. מהו הטיפול המיידי?";
        elements.eventActionBtn.textContent = "הזן גלוקוז נוזלי דרך פתח מעבר האביזרים (Pass-through)";
        elements.eventActionBtn.className = "btn btn-accent btn-block";
        elements.emergencyAbortBtn.classList.remove('hidden');
        elements.simEventPanel.classList.remove('hidden');
        
        // Start alarm sound
        if (state.soundEnabled) {
            gameAudio.startAlarm();
        }
        
        // Event timer (must resolve in 6 seconds)
        state.eventTimeLeft = 6;
        state.eventTimer = setInterval(() => {
            state.eventTimeLeft--;
            if (state.eventTimeLeft <= 0) {
                // Failure to resolve
                resolveHypoEvent(false);
            }
        }, 1000);
    }

    function resolveHypoEvent(success) {
        clearInterval(state.eventTimer);
        gameAudio.stopAlarm();
        
        elements.patientBalloon.classList.add('hidden');
        elements.simEventPanel.classList.add('hidden');
        state.activeEvent = null;
        
        elements.simSugar.classList.remove('text-red');
        
        if (success) {
            state.sugarSimValue = 115; // Recovered sugar
            elements.simSugar.textContent = `${state.sugarSimValue} mg/dL`;
            gameAudio.playSuccess();
            updateScore(25);
            showGameModal("הטיפול בהיפוגליקמיה הצליח", "מצוין! העברת לו גלוקוז נוזלי דרך שסתום האביזרים הייעודי של התא מבלי לפגוע בלחץ. המטופל שתה אותו, הסוכר עלה ל-115 mg/dL והוא התאושש במהירות.");
        } else {
            // Patient faints
            gameAudio.playError();
            updateScore(-25);
            showGameModal("איבוד הכרה!", "המטופל איבד את ההכרה עקב היפוגליקמיה קשה! חובה להפסיק טיפול מיידית ולבצע פריקת לחץ מהירה ומבוקרת לשליפת המטופל.", () => {
                endSimulation(false); // Immediate game failure / early end
            });
        }
    }

    elements.emergencyAbortBtn.addEventListener('click', () => {
        if (state.activeEvent === 'hypo') {
            clearInterval(state.eventTimer);
            gameAudio.stopAlarm();
            gameAudio.playClick();
            
            elements.patientBalloon.classList.add('hidden');
            elements.simEventPanel.classList.add('hidden');
            state.activeEvent = null;
            
            showGameModal("עצירת חירום", "עצרת את הטיפול באופן חירום. המטופל פונה בבטחה להמשך עירוי גלוקוז בחוץ, אך הטיפול נקטע.", () => {
                endSimulation(false);
            });
        }
    });

    function endSimulation(completedSuccessfully) {
        // Stop sound hum
        gameAudio.stopHum();
        gameAudio.stopAlarm();
        
        // Clear loops
        clearInterval(state.simInterval);
        clearInterval(state.uiLoop);
        if (state.eventTimer) clearInterval(state.eventTimer);
        
        // Transition screen
        showScreen(elements.screenResults);
        renderResults(completedSuccessfully);
    }

    // --- STAGE 4: RESULTS & SUMMARY ---
    function generateVerificationCode(score) {
        // Obfuscate score: multiply by 17, add a fixed offset, convert to hex
        const obfuscated = ((score * 17) + 2459).toString(16).toUpperCase();
        // Add a random 4-char suffix for variety
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let randomPart = '';
        for (let i = 0; i < 4; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `DF-${obfuscated}-${randomPart}`;
    }

    function renderResults(completedSuccessfully) {
        let achievement = "";
        
        if (!completedSuccessfully) {
            achievement = "הטיפול נכשל בחירום!";
        } else {
            achievement = "סיימת את הטיפול בהצלחה!";
        }
        
        elements.finalAchievement.textContent = achievement;
        
        // Calculate normalized score: Max background score is ~190
        const maxExpectedScore = 190;
        const normalizedScore = Math.min(100, Math.max(0, Math.round((state.score / maxExpectedScore) * 100)));
        
        // Generate obfuscated verification code
        const code = generateVerificationCode(normalizedScore);
        elements.verificationCode.textContent = code;
    }

    if (elements.copyCodeBtn) {
        elements.copyCodeBtn.addEventListener('click', () => {
            const codeText = elements.verificationCode.textContent;
            navigator.clipboard.writeText(codeText).then(() => {
                elements.copyCodeBtn.textContent = 'הועתק בהצלחה!';
                elements.copyCodeBtn.style.background = 'linear-gradient(135deg, var(--primary) 0%, #0099ff 100%)';
                setTimeout(() => {
                    elements.copyCodeBtn.textContent = 'העתק קוד אימות';
                    elements.copyCodeBtn.style.background = '';
                }, 2000);
            }).catch(err => {
                console.error('Error copying code:', err);
            });
        });
    }

    // --- RESTART GAME ---
    elements.restartBtn.addEventListener('click', () => {
        gameAudio.playClick();
        
        // Reset state
        state.score = 0;
        state.q1Answered = false;
        state.scanComplete = false;
        state.tcpo2Value = 0;
        state.q2Answered = false;
        state.sugarMeasured = false;
        state.sugarValue = 112;
        state.sugarCorrected = false;
        state.q3Answered = false;
        
        // Reset UI components
        elements.tcpo2Val.textContent = '--';
        elements.tcpo2Explanation.classList.add('hidden');
        elements.toPrepBtn.classList.add('hidden');
        elements.scannerAction.classList.add('hidden');
        elements.laserSensor.style.display = 'flex';
        elements.laserSensor.style.left = '20px';
        elements.laserSensor.style.top = '20px';
        
        elements.q1Options.forEach(btn => btn.className = 'option-btn');
        elements.q2Options.forEach(btn => btn.className = 'option-btn');
        elements.q3Options.forEach(btn => btn.className = 'patient-card-option');
        
        elements.prepQ1Section.classList.remove('hidden');
        elements.prepQ2Section.classList.add('hidden');
        elements.prepFeedback1.classList.add('hidden');
        elements.toDiveBtn.classList.add('hidden');
        elements.briefingOverlay.classList.remove('hidden');
        elements.modalOverlay.classList.add('hidden');
        elements.glucoActionArea.classList.add('hidden');
        elements.glucoAlert.classList.remove('hidden');
        
        // Reset Glucometer device states
        elements.glucoVal.textContent = '---';
        elements.glucoVal.style.color = '';
        elements.glucoMessage.textContent = 'הכנס סטיק';
        elements.glucoStrip.classList.remove('inserted');
        elements.glucoBloodSpot.classList.remove('active');
        
        elements.testSugarBtn.disabled = true; // initially disabled until Q2 answered
        elements.giveJuiceBtn.className = 'btn btn-accent';
        elements.giveJuiceBtn.disabled = true;
        elements.giveInsulinBtn.disabled = true;
        elements.glucoVal.textContent = '---';
        elements.glucoVal.style.color = '#00ffcc';
        
        // Go to Welcome screen
        showScreen(elements.screenIntro);
    });
});
