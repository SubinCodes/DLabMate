const mongoose = require('mongoose'); // This line was missing!

const CaseSchema = new mongoose.Schema({
    caseId: { type: String, required: true, unique: true }, 
    clinicName: { type: String, required: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    impressionType: { type: String, required: true },
    material: [{ type: String }], 
    workType: [{ type: String }], 
    unit: { type: Number, required: true },
    teethNo: [{ type: String }], 
    arrivalDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, default: 'Entered' },
    deliveryStatus: { type: String, default: 'Undelivered' },
    shade: [{ type: String }] 
}, { timestamps: true });

module.exports = mongoose.model('Case', CaseSchema);