import "server-only";

import { serverEnv } from "@/lib/env";
import {
  detectQrPurpose,
  qrTokenFingerprint,
  signMemberAttendanceWithSecret,
  signTicketWithSecret,
  verifyMemberAttendanceWithSecret,
  verifyTicketTokenWithSecret,
} from "@/lib/qr-token-core";
import type { QrPurpose, QrValidationCode, QrValidationResult } from "@/lib/qr-token-core";

export type { QrPurpose, QrValidationCode, QrValidationResult };
export { detectQrPurpose, qrTokenFingerprint };

export function signMemberAttendance(memberRef:string,ttlSeconds=90,nowMs=Date.now()){return signMemberAttendanceWithSecret(serverEnv.QR_SIGNING_SECRET,memberRef,ttlSeconds,nowMs);}
export function verifyMemberAttendance(token:string,nowMs=Date.now()){return verifyMemberAttendanceWithSecret(serverEnv.QR_SIGNING_SECRET,token,nowMs);}
export function signTicket(ticketId:string,ttlSeconds?:number,nowMs?:number){return signTicketWithSecret(serverEnv.QR_SIGNING_SECRET,ticketId,ttlSeconds,nowMs);}
export function verifyTicketToken(token:string,nowMs=Date.now()){return verifyTicketTokenWithSecret(serverEnv.QR_SIGNING_SECRET,token,nowMs);}
export function verifyTicket(token:string):string|null{const result=verifyTicketToken(token);return result.ok?result.reference:null;}
