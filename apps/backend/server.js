require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PinataSDK } = require("pinata-web3");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configure Upload (Store files in memory temporarily)
const upload = multer({ storage: multer.memoryStorage() });

// 2. Configure Pinata
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

// 3. API Route: Upload to IPFS
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // Create a file object for Pinata
    const file = new File([req.file.buffer], req.file.originalname, {
      type: req.file.mimetype,
    });
    const upload = await pinata.upload.file(file);

    res.json({
      success: true,
      ipfsHash: upload.IpfsHash,
      url: `https://${process.env.PINATA_GATEWAY}/ipfs/${upload.IpfsHash}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`),
);
