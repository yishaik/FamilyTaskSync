import { Router } from "express";
import { storage } from "../storage";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const router = Router();

router.post("/phone", async (req, res) => {
  try {
    console.log("Received phone verification request:", req.body);
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Format phone number - ensure it starts with +
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    console.log("Formatted phone number:", formattedPhone);

    // Find user by phone number
    const user = await storage.getUserByPhone(formattedPhone);
    console.log("Found user:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user needs 2FA setup
    if (!user.twoFactorSecret) {
      // Generate new secret
      const secret = speakeasy.generateSecret({
        name: `Family Tasks:${user.name}`
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Save secret temporarily in session
      req.session.tempSecret = secret.base32;
      req.session.userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return res.json({
        requiresSetup: true,
        qrCode,
        secret: secret.base32
      });
    }

    // User already has 2FA set up
    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.json({ requiresSetup: false });
  } catch (error) {
    console.error("Phone verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    console.log("Received verification request:", req.body);
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ message: "Phone number and code are required" });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    console.log("Formatted phone number:", formattedPhone);

    // Find user
    const user = await storage.getUserByPhone(formattedPhone);
    console.log("Found user:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the secret (either temporary or permanent)
    const secret = user.twoFactorSecret || req.session.tempSecret;
    console.log("Using secret:", { tempSecret: !!req.session.tempSecret, permanent: !!user.twoFactorSecret });

    if (!secret) {
      return res.status(400).json({ message: "2FA not set up" });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 30 seconds of leeway
    });

    if (!verified) {
      return res.status(401).json({ message: "Invalid code" });
    }

    // If using temporary secret, save it permanently
    if (!user.twoFactorSecret && req.session.tempSecret) {
      await storage.updateUser(user.id, {
        twoFactorSecret: req.session.tempSecret
      });
      delete req.session.tempSecret;
    }

    // Set user as authenticated and save session
    req.session.isAuthenticated = true;
    req.session.userId = user.id;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Code verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;