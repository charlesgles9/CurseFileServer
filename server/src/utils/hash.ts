import crypto from "crypto";
const Hash = (secret: string, data: string): string => {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

export default Hash;
