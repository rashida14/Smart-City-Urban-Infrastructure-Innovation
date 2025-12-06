import mongoose from 'mongoose';

const potholeReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    imageData: { type: String, required: true }, // base64 data URL
    severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Detected', 'Under Repair', 'Fixed'], default: 'Detected' },
    detections: [
      {
        x: Number,
        y: Number,
        w: Number,
        h: Number,
        score: Number,
        label: { type: String, default: 'pothole' },
      },
    ],
  },
  { timestamps: true }
);

const PotholeReport = mongoose.model('PotholeReport', potholeReportSchema);
export default PotholeReport;
