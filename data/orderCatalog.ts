import { OrderCategory } from '../types';

/**
 * The bedside order catalogue.
 *
 * Everything a physician can do at the bedside is a clickable order, grouped the
 * way an ER board is laid out. Items flagged `critical` are the time-critical,
 * "must-not-miss" resuscitative actions (hemorrhage control, decompression,
 * airway, reversal) — they are surfaced separately so they are always one click
 * away instead of buried in a free-text prompt.
 */

export interface OrderItem {
  label: string;
  detail: string;
  category: OrderCategory;
  critical?: boolean;
  /** Extra search terms so "pelvis", "bleeding", "REBOA" all find the right order. */
  keywords?: string;
}

export interface OrderGroup {
  id: string;
  title: string;
  blurb: string;
  items: OrderItem[];
}

export const ORDER_GROUPS: OrderGroup[] = [
  {
    id: 'critical',
    title: 'Critical Actions',
    blurb: 'Time-critical resuscitation — hemorrhage control, decompression, airway, reversal.',
    items: [
      {
        label: 'Pelvic Binder',
        detail: 'Apply a pelvic binder centred over the greater trochanters and internally rotate/bind the legs for suspected pelvic ring injury.',
        category: 'critical',
        critical: true,
        keywords: 'pelvis pelvic fracture sheet binder trauma open book hemorrhage',
      },
      {
        label: 'Arterial Tourniquet',
        detail: 'Apply a windlass tourniquet high and tight proximal to the extremity hemorrhage, tighten until the bleeding stops and the distal pulse is lost, and mark the time of application.',
        category: 'critical',
        critical: true,
        keywords: 'tourniquet CAT extremity amputation limb arterial bleeding exsanguination',
      },
      {
        label: 'Wound Packing / Pressure',
        detail: 'Pack the junctional wound with hemostatic gauze and hold firm direct pressure for three minutes.',
        category: 'critical',
        critical: true,
        keywords: 'hemostatic combat gauze junctional direct pressure bleeding groin axilla',
      },
      {
        label: 'Needle Decompression',
        detail: 'Perform needle decompression with a 14G catheter in the 5th intercostal space at the anterior axillary line for suspected tension pneumothorax.',
        category: 'critical',
        critical: true,
        keywords: 'tension pneumothorax needle thoracostomy chest decompress',
      },
      {
        label: 'Finger Thoracostomy',
        detail: 'Perform a finger thoracostomy in the 5th intercostal space, then place a chest tube.',
        category: 'critical',
        critical: true,
        keywords: 'thoracostomy chest tube pneumothorax hemothorax trauma',
      },
      {
        label: 'Massive Transfusion Protocol',
        detail: 'Activate the massive transfusion protocol — 1:1:1 packed red cells, plasma, and platelets — and call the blood bank now.',
        category: 'critical',
        critical: true,
        keywords: 'MTP blood products balanced resuscitation hemorrhagic shock 1:1:1',
      },
      {
        label: 'Tranexamic Acid (TXA)',
        detail: 'Give tranexamic acid 1 g IV over 10 minutes, then 1 g infused over 8 hours, for hemorrhagic trauma within 3 hours of injury.',
        category: 'critical',
        critical: true,
        keywords: 'TXA antifibrinolytic trauma bleeding hemorrhage',
      },
      {
        label: 'Uncrossmatched Blood',
        detail: 'Transfuse 2 units of emergency-release O-negative packed red cells through a rapid infuser/level 1 warmer.',
        category: 'critical',
        critical: true,
        keywords: 'O negative emergency release transfusion PRBC blood shock',
      },
      {
        label: 'Rapid Sequence Intubation',
        detail: 'Perform rapid sequence intubation — preoxygenate, ketamine 1.5 mg/kg IV and rocuronium 1.2 mg/kg IV, video laryngoscopy, confirm with waveform capnography.',
        category: 'critical',
        critical: true,
        keywords: 'RSI airway intubate ETT laryngoscopy ketamine rocuronium',
      },
      {
        label: 'Cricothyrotomy',
        detail: 'Declare a failed airway and perform a surgical cricothyrotomy (scalpel-bougie-tube).',
        category: 'critical',
        critical: true,
        keywords: 'surgical airway cric cannot intubate cannot oxygenate CICO',
      },
      {
        label: 'Defibrillate 200 J',
        detail: 'Defibrillate at 200 J biphasic. CLEAR — shock delivered, resume compressions immediately.',
        category: 'critical',
        critical: true,
        keywords: 'defibrillation VF pulseless VT shock arrest ACLS',
      },
      {
        label: 'Start CPR / ACLS',
        detail: 'Begin high-quality chest compressions, run the ACLS algorithm, and attach pads with a rhythm check every 2 minutes.',
        category: 'critical',
        critical: true,
        keywords: 'CPR cardiac arrest code blue compressions ACLS resuscitation',
      },
      {
        label: 'Synchronized Cardioversion',
        detail: 'Sedate and perform synchronized cardioversion at 120 J for the unstable tachydysrhythmia.',
        category: 'critical',
        critical: true,
        keywords: 'cardioversion unstable SVT atrial fibrillation VT sync shock',
      },
      {
        label: 'Transcutaneous Pacing',
        detail: 'Start transcutaneous pacing at 80 bpm, titrate current to electrical and mechanical capture, and give sedation.',
        category: 'critical',
        critical: true,
        keywords: 'pacing bradycardia heart block capture pacer',
      },
      {
        label: 'Pericardiocentesis',
        detail: 'Perform an ultrasound-guided subxiphoid pericardiocentesis for tamponade physiology.',
        category: 'critical',
        critical: true,
        keywords: 'tamponade pericardial effusion drain beck triad',
      },
      {
        label: 'Resuscitative Thoracotomy',
        detail: 'Perform a left anterolateral resuscitative thoracotomy for penetrating trauma with recent loss of vitals.',
        category: 'critical',
        critical: true,
        keywords: 'ED thoracotomy clamshell penetrating arrest cross clamp',
      },
      {
        label: 'REBOA',
        detail: 'Consider REBOA — place a femoral arterial sheath and occlude the aorta in zone 1 for non-compressible torso hemorrhage.',
        category: 'critical',
        critical: true,
        keywords: 'aortic occlusion balloon noncompressible torso hemorrhage endovascular',
      },
      {
        label: 'Spinal Motion Restriction',
        detail: 'Apply a rigid cervical collar and maintain spinal motion restriction with log-roll precautions.',
        category: 'critical',
        critical: true,
        keywords: 'c-collar cervical spine immobilization trauma logroll',
      },
      {
        label: 'Traction Splint',
        detail: 'Apply a traction splint to the mid-shaft femur fracture and reassess the distal neurovascular exam.',
        category: 'critical',
        critical: true,
        keywords: 'femur fracture splint traction orthopedic',
      },
      {
        label: 'Activate Trauma Team',
        detail: 'Activate the level 1 trauma team and mobilize the OR.',
        category: 'critical',
        critical: true,
        keywords: 'trauma activation surgery OR level 1',
      },
      {
        label: 'Activate Cath Lab',
        detail: 'Activate the cardiac catheterization lab for primary PCI and page interventional cardiology.',
        category: 'critical',
        critical: true,
        keywords: 'STEMI PCI cath lab door to balloon MI',
      },
      {
        label: 'Activate Stroke Team',
        detail: 'Activate the stroke team, obtain a non-contrast head CT with CTA, and calculate the NIHSS.',
        category: 'critical',
        critical: true,
        keywords: 'stroke code CVA thrombolysis thrombectomy NIHSS',
      },
      {
        label: 'Push-Dose Pressor',
        detail: 'Give push-dose epinephrine 10–20 mcg IV every 2–5 minutes for peri-intubation hypotension.',
        category: 'critical',
        critical: true,
        keywords: 'push dose pressor epinephrine phenylephrine hypotension bridge',
      },
      {
        label: 'IM Epinephrine',
        detail: 'Give epinephrine 0.5 mg (0.5 mL of 1:1000) IM into the lateral thigh for anaphylaxis and repeat every 5 minutes as needed.',
        category: 'critical',
        critical: true,
        keywords: 'anaphylaxis epipen allergic reaction angioedema IM epi',
      },
      {
        label: 'Naloxone',
        detail: 'Give naloxone 0.4 mg IV/IM, titrating to adequate respirations, and support ventilation with a BVM.',
        category: 'critical',
        critical: true,
        keywords: 'opioid overdose narcan reversal apnea',
      },
      {
        label: 'D50 / Dextrose',
        detail: 'Give 50 mL of D50W IV push for hypoglycemia and recheck the glucose in 15 minutes.',
        category: 'critical',
        critical: true,
        keywords: 'hypoglycemia dextrose glucose D50 sugar',
      },
      {
        label: 'Calcium for Hyperkalemia',
        detail: 'Give calcium gluconate 1 g IV to stabilize the myocardium, then insulin 10 units with D50, albuterol, and arrange dialysis.',
        category: 'critical',
        critical: true,
        keywords: 'hyperkalemia potassium calcium membrane stabilization peaked T waves',
      },
      {
        label: '3% Hypertonic Saline',
        detail: 'Give 3% hypertonic saline 150 mL IV bolus over 10 minutes for herniation or severe symptomatic hyponatremia.',
        category: 'critical',
        critical: true,
        keywords: 'hypertonic saline hyponatremia herniation ICP cerebral edema',
      },
    ],
  },
  {
    id: 'resus',
    title: 'Airway, Breathing & Access',
    blurb: 'Oxygenation, ventilation, monitoring, and vascular access.',
    items: [
      { label: 'ABCs / Primary Survey', detail: 'Perform the primary survey: airway, breathing, circulation, disability, exposure.', category: 'exam', keywords: 'primary survey ATLS abcde trauma' },
      { label: 'Airway Positioning', detail: 'Open the airway with a jaw thrust, suction secretions, and place an oral airway.', category: 'procedure', keywords: 'jaw thrust suction OPA NPA airway' },
      { label: 'High-Flow Oxygen', detail: 'Place the patient on 15 L/min oxygen via non-rebreather mask.', category: 'procedure', keywords: 'oxygen NRB non rebreather hypoxia' },
      { label: 'BVM Ventilation', detail: 'Begin bag-valve-mask ventilation with a two-person technique and a PEEP valve.', category: 'procedure', keywords: 'bag mask ventilate apnea BVM' },
      { label: 'BiPAP / NIV', detail: 'Start BiPAP at 12/5 cm H2O and titrate to work of breathing and oxygenation.', category: 'procedure', keywords: 'noninvasive ventilation CPAP BiPAP CHF COPD' },
      { label: 'High-Flow Nasal Cannula', detail: 'Start high-flow nasal cannula at 40 L/min, FiO2 titrated to a target saturation.', category: 'procedure', keywords: 'HFNC optiflow oxygen' },
      { label: 'Ventilator Settings', detail: 'Set lung-protective ventilation: 6 mL/kg predicted body weight, PEEP 5, RR 16, FiO2 titrated to saturation.', category: 'procedure', keywords: 'ventilator ARDS tidal volume PEEP settings' },
      { label: 'Two Large-Bore IVs', detail: 'Establish two large-bore (18G or larger) peripheral IVs and send off the initial labs.', category: 'procedure', keywords: 'IV access peripheral line bore' },
      { label: 'Intraosseous Access', detail: 'Place an intraosseous line in the proximal tibia for immediate access.', category: 'procedure', keywords: 'IO tibia humeral access difficult IV' },
      { label: 'Central Line', detail: 'Place an ultrasound-guided central venous catheter in the right internal jugular vein.', category: 'procedure', keywords: 'central venous catheter CVC IJ femoral subclavian' },
      { label: 'Arterial Line', detail: 'Place a radial arterial line for continuous blood pressure monitoring.', category: 'procedure', keywords: 'a-line arterial blood pressure monitoring' },
      { label: 'Full Monitoring', detail: 'Place the patient on continuous cardiac monitoring, pulse oximetry, capnography, and cycle the blood pressure every 5 minutes.', category: 'procedure', keywords: 'monitor telemetry pulse ox capnography vitals' },
      { label: 'Recheck Full Vitals', detail: 'Cycle the blood pressure and recheck a complete set of vital signs including temperature.', category: 'exam', keywords: 'vitals repeat blood pressure recheck' },
      { label: 'Foley Catheter', detail: 'Place a Foley catheter and monitor hourly urine output.', category: 'procedure', keywords: 'foley urinary catheter urine output' },
      { label: 'Nasogastric Tube', detail: 'Place a nasogastric tube to low intermittent suction.', category: 'procedure', keywords: 'NG tube gastric decompression' },
    ],
  },
  {
    id: 'meds',
    title: 'Medications',
    blurb: 'Drips, pushes, and antidotes with standard adult ED dosing.',
    items: [
      { label: 'Crystalloid Bolus', detail: 'Give a 500 mL bolus of balanced crystalloid (lactated Ringer\'s) IV and reassess perfusion.', category: 'medication', keywords: 'fluids LR normal saline bolus resuscitation' },
      { label: 'Norepinephrine', detail: 'Start a norepinephrine infusion at 0.05 mcg/kg/min, titrated to a MAP above 65 mmHg.', category: 'medication', keywords: 'levophed pressor vasopressor shock MAP' },
      { label: 'Epinephrine Infusion', detail: 'Start an epinephrine infusion at 0.05 mcg/kg/min for refractory shock or anaphylaxis.', category: 'medication', keywords: 'epi drip pressor inotrope anaphylaxis' },
      { label: 'Vasopressin', detail: 'Add vasopressin 0.03 units/min as a second-line vasopressor.', category: 'medication', keywords: 'vasopressin pressor septic shock' },
      { label: 'Broad-Spectrum Antibiotics', detail: 'Give piperacillin-tazobactam 4.5 g IV and vancomycin 20 mg/kg IV after drawing blood cultures.', category: 'medication', keywords: 'sepsis antibiotics zosyn vancomycin cultures' },
      { label: 'Ceftriaxone + Vancomycin', detail: 'Give ceftriaxone 2 g IV and vancomycin 20 mg/kg IV for suspected meningitis, plus dexamethasone 10 mg IV before the first dose.', category: 'medication', keywords: 'meningitis ceftriaxone dexamethasone CNS' },
      { label: 'Aspirin 324 mg', detail: 'Give aspirin 324 mg chewed for suspected acute coronary syndrome.', category: 'medication', keywords: 'ASA aspirin ACS MI antiplatelet' },
      { label: 'Nitroglycerin', detail: 'Give nitroglycerin 0.4 mg sublingual every 5 minutes, or start a drip for hypertensive pulmonary edema.', category: 'medication', keywords: 'nitro chest pain CHF afterload' },
      { label: 'Heparin', detail: 'Start a heparin infusion — 80 units/kg bolus, then 18 units/kg/hr — after confirming there is no contraindication.', category: 'medication', keywords: 'anticoagulation heparin PE ACS DVT' },
      { label: 'Amiodarone', detail: 'Give amiodarone 150 mg IV over 10 minutes, then an infusion at 1 mg/min.', category: 'medication', keywords: 'antiarrhythmic VT arrhythmia amiodarone' },
      { label: 'Adenosine', detail: 'Give adenosine 6 mg rapid IV push with a flush; repeat at 12 mg if the SVT persists.', category: 'medication', keywords: 'SVT adenosine rapid push narrow complex' },
      { label: 'Atropine', detail: 'Give atropine 1 mg IV push for symptomatic bradycardia; repeat every 3–5 minutes to a maximum of 3 mg.', category: 'medication', keywords: 'bradycardia atropine vagal' },
      { label: 'Magnesium Sulfate', detail: 'Give magnesium sulfate 2 g IV over 15 minutes (for torsades, severe asthma, or eclampsia prophylaxis).', category: 'medication', keywords: 'magnesium torsades eclampsia asthma' },
      { label: 'Insulin Infusion', detail: 'Start a regular insulin infusion at 0.1 units/kg/hr after fluid resuscitation and confirming the potassium is above 3.3 mmol/L.', category: 'medication', keywords: 'DKA insulin drip hyperglycemia' },
      { label: 'Albuterol / Ipratropium', detail: 'Give continuous nebulized albuterol with ipratropium and start systemic steroids.', category: 'medication', keywords: 'asthma COPD bronchodilator nebulizer duoneb' },
      { label: 'Methylprednisolone', detail: 'Give methylprednisolone 125 mg IV for the bronchospastic or inflammatory process.', category: 'medication', keywords: 'steroid solumedrol asthma COPD anaphylaxis' },
      { label: 'Fentanyl', detail: 'Give fentanyl 1 mcg/kg IV for analgesia and titrate to comfort.', category: 'medication', keywords: 'analgesia pain opioid fentanyl' },
      { label: 'Ketamine (Analgesic Dose)', detail: 'Give ketamine 0.3 mg/kg IV over 10 minutes for analgesia.', category: 'medication', keywords: 'ketamine pain sedation dissociative' },
      { label: 'Ondansetron', detail: 'Give ondansetron 4 mg IV for nausea.', category: 'medication', keywords: 'zofran nausea vomiting antiemetic' },
      { label: 'Lorazepam / Benzodiazepine', detail: 'Give lorazepam 4 mg IV for the seizure and prepare a second-line agent (levetiracetam 60 mg/kg).', category: 'medication', keywords: 'seizure status epilepticus benzo ativan midazolam' },
      { label: 'Prothrombin Complex Concentrate', detail: 'Give 4-factor PCC plus vitamin K 10 mg IV to reverse warfarin-associated hemorrhage.', category: 'medication', keywords: 'reversal warfarin PCC kcentra vitamin K bleeding' },
      { label: 'Andexanet / Idarucizumab', detail: 'Give the targeted reversal agent for the direct oral anticoagulant — idarucizumab for dabigatran, andexanet alfa for factor Xa inhibitors.', category: 'medication', keywords: 'DOAC reversal praxbind andexxa anticoagulant bleeding' },
      { label: 'Calcium Chloride', detail: 'Give calcium chloride 1 g IV via a central line for hypocalcemia after massive transfusion.', category: 'medication', keywords: 'calcium citrate massive transfusion hypocalcemia' },
      { label: 'Sodium Bicarbonate', detail: 'Give sodium bicarbonate 1–2 mEq/kg IV for the sodium-channel blockade or severe acidemia.', category: 'medication', keywords: 'bicarb acidosis TCA overdose sodium channel' },
      { label: 'Antivenom / Antidote', detail: 'Contact poison control and give the indicated antidote (e.g. N-acetylcysteine, fomepizole, hydroxocobalamin, antivenom).', category: 'medication', keywords: 'toxicology antidote poison control NAC fomepizole cyanide' },
      { label: 'Tetanus Prophylaxis', detail: 'Give Tdap 0.5 mL IM for tetanus prophylaxis.', category: 'medication', keywords: 'tetanus tdap wound immunization' },
    ],
  },
  {
    id: 'labs',
    title: 'Laboratory',
    blurb: 'Bedside and send-out studies.',
    items: [
      { label: 'Bedside Glucose', detail: 'Check a bedside fingerstick glucose now.', category: 'lab', keywords: 'glucose fingerstick sugar POC' },
      { label: 'CBC + Differential', detail: 'Order a CBC with differential.', category: 'lab', keywords: 'cbc hemoglobin white count platelets' },
      { label: 'Chemistry / CMP', detail: 'Order a comprehensive metabolic panel.', category: 'lab', keywords: 'chem BMP CMP electrolytes creatinine' },
      { label: 'Troponin', detail: 'Order a high-sensitivity troponin now and repeat it in one hour.', category: 'lab', keywords: 'troponin ACS MI cardiac enzymes' },
      { label: 'Venous Blood Gas + Lactate', detail: 'Order a venous blood gas with lactate.', category: 'lab', keywords: 'VBG ABG lactate acidosis gas' },
      { label: 'Coagulation Panel', detail: 'Order PT/INR, aPTT, fibrinogen, and a TEG/ROTEM if available.', category: 'lab', keywords: 'INR coags fibrinogen TEG coagulopathy' },
      { label: 'Type & Crossmatch', detail: 'Send a type and crossmatch for 4 units of packed red cells.', category: 'lab', keywords: 'type and screen crossmatch blood bank transfusion' },
      { label: 'Blood Cultures x2', detail: 'Draw two sets of blood cultures from separate sites before antibiotics.', category: 'lab', keywords: 'cultures sepsis bacteremia' },
      { label: 'Urinalysis + Culture', detail: 'Order a urinalysis with culture and a urine pregnancy test.', category: 'lab', keywords: 'UA urine infection pregnancy hcg' },
      { label: 'Beta-hCG', detail: 'Order a quantitative serum beta-hCG.', category: 'lab', keywords: 'pregnancy hcg ectopic' },
      { label: 'Liver Function + Lipase', detail: 'Order LFTs and a lipase.', category: 'lab', keywords: 'LFT lipase pancreatitis hepatic' },
      { label: 'Toxicology Screen', detail: 'Order acetaminophen and salicylate levels, an ethanol level, an osmolar gap, and a urine drug screen.', category: 'lab', keywords: 'tox screen overdose acetaminophen salicylate osmolar' },
      { label: 'D-dimer', detail: 'Order an age-adjusted D-dimer.', category: 'lab', keywords: 'ddimer PE DVT wells' },
      { label: 'BNP', detail: 'Order a BNP.', category: 'lab', keywords: 'BNP heart failure CHF dyspnea' },
      { label: 'Serum Ketones / BHB', detail: 'Order a serum beta-hydroxybutyrate.', category: 'lab', keywords: 'ketones DKA BHB' },
      { label: 'TSH / Cortisol', detail: 'Order a TSH, free T4, and a random cortisol.', category: 'lab', keywords: 'thyroid storm myxedema adrenal cortisol endocrine' },
      { label: 'CSF Studies', detail: 'Send CSF for cell count, protein, glucose, Gram stain, culture, and PCR after the lumbar puncture.', category: 'lab', keywords: 'CSF lumbar puncture meningitis xanthochromia' },
    ],
  },
  {
    id: 'imaging',
    title: 'Imaging',
    blurb: 'Bedside ultrasound through advanced cross-sectional imaging.',
    items: [
      { label: '12-Lead EKG', detail: 'Obtain a 12-lead EKG immediately and hand it to me for interpretation.', category: 'imaging', keywords: 'ecg ekg 12 lead rhythm STEMI' },
      { label: 'Right-Sided / Posterior EKG', detail: 'Obtain right-sided (V4R) and posterior (V7–V9) EKG leads.', category: 'imaging', keywords: 'right sided posterior ecg inferior MI V4R' },
      { label: 'Portable Chest X-Ray', detail: 'Order a portable bedside chest X-ray.', category: 'imaging', keywords: 'CXR chest xray radiograph' },
      { label: 'Pelvic X-Ray', detail: 'Order a portable AP pelvis X-ray.', category: 'imaging', keywords: 'pelvis xray fracture trauma' },
      { label: 'eFAST Exam', detail: 'Perform an eFAST: Morison\'s pouch, splenorenal recess, pelvis, subxiphoid, and bilateral lung sliding.', category: 'imaging', keywords: 'FAST ultrasound trauma free fluid pneumothorax POCUS' },
      { label: 'Bedside Echo', detail: 'Perform a bedside echocardiogram to assess RV strain, effusion, and contractility.', category: 'imaging', keywords: 'echo POCUS cardiac tamponade RV strain' },
      { label: 'Lung / IVC Ultrasound', detail: 'Perform a lung and IVC ultrasound to assess B-lines and volume status.', category: 'imaging', keywords: 'POCUS lung B-lines IVC volume ultrasound' },
      { label: 'CT Head (non-contrast)', detail: 'Order a non-contrast CT of the head.', category: 'imaging', keywords: 'head CT stroke bleed ICH trauma' },
      { label: 'CT Angiogram Head/Neck', detail: 'Order a CT angiogram of the head and neck with perfusion imaging.', category: 'imaging', keywords: 'CTA stroke LVO dissection perfusion' },
      { label: 'CT Angiogram Chest (PE)', detail: 'Order a CT pulmonary angiogram to evaluate for pulmonary embolism.', category: 'imaging', keywords: 'CTPA PE pulmonary embolism dissection chest' },
      { label: 'CT Abdomen/Pelvis', detail: 'Order a CT of the abdomen and pelvis with IV contrast.', category: 'imaging', keywords: 'CT abdomen pelvis appendicitis contrast' },
      { label: 'Pan-Scan (Trauma)', detail: 'Order a trauma pan-scan: CT head, cervical spine, chest, abdomen, and pelvis.', category: 'imaging', keywords: 'pan scan trauma CT whole body' },
      { label: 'Extremity X-Ray', detail: 'Order plain films of the injured extremity in two views.', category: 'imaging', keywords: 'xray fracture extremity limb' },
      { label: 'Ultrasound (RUQ / Renal / DVT)', detail: 'Order a formal ultrasound of the region in question (right upper quadrant, renal, or lower-extremity venous duplex).', category: 'imaging', keywords: 'ultrasound gallbladder hydronephrosis DVT duplex' },
    ],
  },
  {
    id: 'procedures',
    title: 'Procedures',
    blurb: 'Bedside procedures beyond the immediate resuscitation.',
    items: [
      { label: 'Chest Tube', detail: 'Place a 28 Fr chest tube in the 5th intercostal space and connect it to suction.', category: 'procedure', keywords: 'thoracostomy tube chest drain hemothorax' },
      { label: 'Lumbar Puncture', detail: 'Perform a lumbar puncture at L3-L4 and measure the opening pressure.', category: 'procedure', keywords: 'LP spinal tap meningitis SAH CSF' },
      { label: 'Fracture / Joint Reduction', detail: 'Provide procedural sedation and reduce the fracture or dislocation, then splint and reassess neurovascular status.', category: 'procedure', keywords: 'reduction dislocation splint orthopedic sedation' },
      { label: 'Procedural Sedation', detail: 'Perform procedural sedation with ketamine 1 mg/kg IV, with full monitoring and airway equipment at the bedside.', category: 'procedure', keywords: 'sedation ketamine propofol procedure' },
      { label: 'Laceration Repair', detail: 'Irrigate the wound copiously, explore for foreign body, anesthetize, and close.', category: 'procedure', keywords: 'suture laceration wound repair irrigation' },
      { label: 'Escharotomy', detail: 'Perform an escharotomy for circumferential full-thickness burns compromising perfusion or ventilation.', category: 'procedure', keywords: 'burn escharotomy circumferential compartment' },
      { label: 'Active Rewarming / Cooling', detail: 'Begin active temperature management — warmed IV fluids and forced-air warming, or evaporative cooling with ice packs for heat stroke.', category: 'procedure', keywords: 'hypothermia hyperthermia rewarming cooling heat stroke' },
      { label: 'Decontamination', detail: 'Decontaminate the patient — remove clothing and irrigate copiously — with the team in appropriate PPE.', category: 'procedure', keywords: 'decon chemical exposure irrigation hazmat' },
      { label: 'Gastric Decontamination', detail: 'Give activated charcoal 1 g/kg PO if the airway is protected and the ingestion is recent.', category: 'procedure', keywords: 'charcoal overdose ingestion decontamination' },
    ],
  },
  {
    id: 'bedside',
    title: 'History & Examination',
    blurb: 'Talk to the patient, examine the patient, collect collateral.',
    items: [
      { label: 'Focused History', detail: 'Take a focused history of the presenting complaint — onset, character, radiation, associated symptoms, and aggravating factors.', category: 'history', keywords: 'HPI history complaint OPQRST' },
      { label: 'SAMPLE / AMPLE History', detail: 'Take an AMPLE history: allergies, medications, past history, last meal, and events surrounding the presentation.', category: 'history', keywords: 'AMPLE SAMPLE allergies medications past history' },
      { label: 'Collateral History', detail: 'Obtain collateral history from EMS, family, or the nursing home.', category: 'history', keywords: 'collateral EMS family witness bystander' },
      { label: 'Medication & Allergy Review', detail: 'Review the medication list and allergies, with particular attention to anticoagulants, beta-blockers, and immunosuppressants.', category: 'history', keywords: 'medications allergies anticoagulant reconciliation' },
      { label: 'Head-to-Toe Exam', detail: 'Perform a complete head-to-toe physical examination.', category: 'exam', keywords: 'physical exam full head to toe secondary survey' },
      { label: 'Cardiopulmonary Exam', detail: 'Examine the heart and lungs — heart sounds, murmurs, JVP, breath sounds, and work of breathing.', category: 'exam', keywords: 'heart lungs auscultation murmur JVP breath sounds' },
      { label: 'Abdominal Exam', detail: 'Examine the abdomen for tenderness, guarding, rebound, distension, and pulsatile mass.', category: 'exam', keywords: 'abdomen belly peritonitis guarding rebound' },
      { label: 'Neurologic Exam', detail: 'Perform a full neurologic exam including cranial nerves, strength, sensation, cerebellar testing, and the NIHSS.', category: 'exam', keywords: 'neuro exam NIHSS cranial nerves stroke GCS' },
      { label: 'Expose & Log-Roll', detail: 'Fully expose the patient and log-roll to inspect the back, flanks, and perineum.', category: 'exam', keywords: 'expose logroll secondary survey back trauma' },
      { label: 'Skin & Extremity Exam', detail: 'Examine the skin for rash, purpura, crepitus, and perfusion, and check distal pulses in all extremities.', category: 'exam', keywords: 'skin rash purpura pulses perfusion extremity' },
    ],
  },
  {
    id: 'dispo',
    title: 'Consults & Disposition',
    blurb: 'Bring in the specialists and move the patient.',
    items: [
      { label: 'Surgical Consult', detail: 'Consult general/trauma surgery at the bedside now.', category: 'consult', keywords: 'surgery consult trauma OR' },
      { label: 'Cardiology Consult', detail: 'Consult cardiology.', category: 'consult', keywords: 'cardiology consult cardiac' },
      { label: 'Neurology / Neurosurgery', detail: 'Consult neurology and neurosurgery.', category: 'consult', keywords: 'neurology neurosurgery consult stroke bleed' },
      { label: 'OB/GYN Consult', detail: 'Consult obstetrics and gynecology.', category: 'consult', keywords: 'obstetrics gynecology pregnancy consult' },
      { label: 'Toxicology / Poison Control', detail: 'Call the poison control centre and consult medical toxicology.', category: 'consult', keywords: 'toxicology poison control overdose consult' },
      { label: 'ICU Admission', detail: 'Admit the patient to the intensive care unit and call the intensivist.', category: 'disposition', keywords: 'ICU admit critical care disposition' },
      { label: 'Admit to Floor', detail: 'Admit the patient to a monitored medical floor bed.', category: 'disposition', keywords: 'admit floor telemetry disposition' },
      { label: 'To the OR', detail: 'Take the patient directly to the operating room.', category: 'disposition', keywords: 'OR operating room surgery emergent' },
      { label: 'Transfer / Retrieval', detail: 'Arrange transfer to a higher level of care and speak to the accepting physician.', category: 'disposition', keywords: 'transfer retrieval tertiary accepting' },
      { label: 'Goals of Care Discussion', detail: 'Have a goals-of-care conversation with the patient and family and clarify the resuscitation status.', category: 'disposition', keywords: 'goals of care DNR family palliative code status' },
      { label: 'Discharge with Follow-Up', detail: 'Discharge the patient with clear return precautions and arranged follow-up.', category: 'disposition', keywords: 'discharge home follow up return precautions' },
    ],
  },
];

/** Flattened catalogue, useful for search and for classifying typed commands. */
export const ALL_ORDERS: OrderItem[] = ORDER_GROUPS.flatMap((g) => g.items);

/** The built-in critical-action library, always clickable regardless of the case. */
export const CRITICAL_ACTIONS: OrderItem[] = ALL_ORDERS.filter((o) => o.critical);

/** Shown on the sim-room command bar — the handful used on nearly every case. */
export const QUICK_ACTIONS: OrderItem[] = [
  ALL_ORDERS.find((o) => o.label === 'Focused History')!,
  ALL_ORDERS.find((o) => o.label === 'Head-to-Toe Exam')!,
  ALL_ORDERS.find((o) => o.label === 'Recheck Full Vitals')!,
  ALL_ORDERS.find((o) => o.label === '12-Lead EKG')!,
  ALL_ORDERS.find((o) => o.label === 'Two Large-Bore IVs')!,
  ALL_ORDERS.find((o) => o.label === 'CBC + Differential')!,
  ALL_ORDERS.find((o) => o.label === 'Portable Chest X-Ray')!,
  ALL_ORDERS.find((o) => o.label === 'eFAST Exam')!,
];

const CATEGORY_HINTS: { category: OrderCategory; terms: string[] }[] = [
  { category: 'critical', terms: ['tourniquet', 'pelvic binder', 'thoracotomy', 'cricothyro', 'reboa', 'massive transfusion', 'defibrill', 'needle decompress', 'cpr', 'code blue'] },
  { category: 'medication', terms: ['give ', 'administer', 'mg', 'mcg', 'grams', ' iv push', 'bolus', 'infusion', 'drip', 'start a', 'antibiotic', 'epinephrine', 'ketamine', 'fentanyl', 'insulin', 'naloxone'] },
  { category: 'lab', terms: ['cbc', 'chem', 'panel', 'troponin', 'lactate', 'blood gas', 'culture', 'urinalysis', 'd-dimer', 'inr', 'crossmatch', 'level', 'lab'] },
  { category: 'imaging', terms: ['x-ray', 'xray', 'ct ', 'ekg', 'ecg', 'ultrasound', 'echo', 'fast', 'mri', 'imaging', 'radiograph'] },
  { category: 'procedure', terms: ['intubat', 'chest tube', 'central line', 'lumbar puncture', 'catheter', 'splint', 'suture', 'reduce', 'sedation', 'place ', 'insert'] },
  { category: 'exam', terms: ['exam', 'auscultat', 'palpat', 'inspect', 'listen', 'look at', 'vitals'] },
  { category: 'history', terms: ['ask', 'history', 'tell me', 'what happened', 'collateral', 'allerg'] },
  { category: 'consult', terms: ['consult', 'call ', 'page ', 'activate'] },
  { category: 'disposition', terms: ['admit', 'discharge', 'transfer', 'operating room', 'disposition', 'icu'] },
];

/**
 * Best-effort classification of a free-text order so typed commands land in the
 * right section of the chart alongside the ones placed from the catalogue.
 */
export function classifyOrder(text: string): OrderCategory {
  const known = matchOrder(text);
  if (known) return known.category;
  const t = (text || '').toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.terms.some((term) => t.includes(term))) return hint.category;
  }
  return 'other';
}

/** Loose comparison key — case, punctuation, and "(TXA)"-style suffixes removed. */
const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Find the catalogue order a piece of free text is naming, if any. */
export function matchOrder(text: string): OrderItem | undefined {
  const raw = (text || '').trim();
  if (!raw) return undefined;

  const byDetail = ALL_ORDERS.find((o) => o.detail === raw);
  if (byDetail) return byDetail;

  const t = normalize(raw);
  const exact = ALL_ORDERS.find((o) => normalize(o.label) === t);
  if (exact) return exact;

  return ALL_ORDERS.find((o) => {
    const l = normalize(o.label);
    return l.length >= 6 && t.length >= 6 && (t.includes(l) || l.includes(t));
  });
}

/**
 * Map free text (typically a critical action named by the clinical engine) onto a
 * catalogue order so the wording, dosing, and category stay consistent. Falls back
 * to a critical action carrying the engine's own words.
 */
export function resolveOrderText(text: string): OrderItem {
  return matchOrder(text) || { label: text, detail: text, category: 'critical', critical: true };
}

/** A short chart-friendly label for a free-text order. */
export function labelForOrder(text: string): string {
  const known = matchOrder(text);
  if (known) return known.label;
  const clean = (text || '').trim().replace(/\s+/g, ' ');
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

export const CATEGORY_LABELS: Record<OrderCategory, string> = {
  critical: 'Critical Action',
  medication: 'Medication',
  lab: 'Laboratory',
  imaging: 'Imaging',
  procedure: 'Procedure',
  exam: 'Examination',
  history: 'History',
  consult: 'Consult',
  disposition: 'Disposition',
  other: 'Order',
};
