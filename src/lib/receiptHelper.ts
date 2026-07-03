export interface LocalReceipt {
  id: string;
  providerId: string;
  providerName: string;
  
  checkIn: string;
  checkInLocation?: string;
  checkInPhoto?: string;
  checkInHash: string;
  
  checkOut?: string;
  checkOutLocation?: string;
  checkOutPhoto?: string;
  checkOutHash?: string;
}

const SALT = "HoraFaceSecureSalt2026";

async function sha256(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateHash(
  recordId: string,
  providerId: string,
  timestamp: string,
  location?: string,
  photo?: string
): Promise<string> {
  const photoLength = photo ? photo.length : 0;
  const photoEnd = photo ? photo.slice(-50) : "";
  const photoDigest = photoLength > 0 ? `${photoLength}-${photoEnd}` : "";
  
  const data = `${recordId}|${providerId}|${timestamp}|${location || ''}|${photoDigest}|${SALT}`;
  return sha256(data);
}

export async function saveLocalCheckIn(
  recordId: string,
  providerId: string,
  providerName: string,
  timestamp: string,
  location?: string,
  photo?: string
): Promise<LocalReceipt> {
  const hash = await generateHash(recordId, providerId, timestamp, location, photo);
  const newReceipt: LocalReceipt = {
    id: recordId,
    providerId,
    providerName,
    checkIn: timestamp,
    checkInLocation: location,
    checkInPhoto: photo,
    checkInHash: hash
  };

  try {
    const receipts = getLocalReceipts();
    const idx = receipts.findIndex(r => r.id === recordId);
    if (idx !== -1) {
      receipts[idx] = { ...receipts[idx], ...newReceipt };
    } else {
      receipts.push(newReceipt);
    }
    localStorage.setItem("HORAFACE_LOCAL_RECEIPTS", JSON.stringify(receipts));
  } catch (err) {
    console.error("saveLocalCheckIn error:", err);
  }

  return newReceipt;
}

export async function saveLocalCheckOut(
  recordId: string,
  providerId: string,
  providerName: string,
  timestamp: string,
  location?: string,
  photo?: string
): Promise<LocalReceipt> {
  const hash = await generateHash(recordId, providerId, timestamp, location, photo);
  
  try {
    const receipts = getLocalReceipts();
    const idx = receipts.findIndex(r => r.id === recordId);
    
    if (idx !== -1) {
      receipts[idx].checkOut = timestamp;
      receipts[idx].checkOutLocation = location;
      receipts[idx].checkOutPhoto = photo;
      receipts[idx].checkOutHash = hash;
      
      localStorage.setItem("HORAFACE_LOCAL_RECEIPTS", JSON.stringify(receipts));
      return receipts[idx];
    } else {
      const fallback: LocalReceipt = {
        id: recordId,
        providerId,
        providerName,
        checkIn: timestamp,
        checkInHash: "FALLBACK_NO_CHECKIN_HASH",
        checkOut: timestamp,
        checkOutLocation: location,
        checkOutPhoto: photo,
        checkOutHash: hash
      };
      receipts.push(fallback);
      localStorage.setItem("HORAFACE_LOCAL_RECEIPTS", JSON.stringify(receipts));
      return fallback;
    }
  } catch (err) {
    console.error("saveLocalCheckOut error:", err);
    return {
      id: recordId,
      providerId,
      providerName,
      checkIn: timestamp,
      checkInHash: "ERROR_HASH",
      checkOut: timestamp,
      checkOutHash: hash
    };
  }
}

export function getLocalReceipts(): LocalReceipt[] {
  try {
    const str = localStorage.getItem("HORAFACE_LOCAL_RECEIPTS") || "[]";
    return JSON.parse(str);
  } catch {
    return [];
  }
}

export function getLocalReceipt(recordId: string): LocalReceipt | undefined {
  const receipts = getLocalReceipts();
  return receipts.find(r => r.id === recordId);
}
