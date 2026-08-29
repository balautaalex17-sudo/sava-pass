import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const MEMBER_PREFIX = "SPM1";
const TICKET_PREFIX = "SPT2";
const LEGACY_TICKET_PREFIX = "SP1";
const DEFAULT_TICKET_TTL_SECONDS = 400 * 24 * 60 * 60;

const payloadSchema = z.object({ p: z.enum(["member_attendance", "event_ticket"]), v: z.number().int().positive(), ref: z.string().uuid(), iat: z.number().int().nonnegative(), exp: z.number().int().positive(), nonce: z.string().uuid() });
type SignedPayload = z.infer<typeof payloadSchema>;
export type QrPurpose = SignedPayload["p"];
export type QrValidationCode = "invalid_token" | "expired_token" | "wrong_qr_type";
export type QrValidationResult = { ok:true; reference:string; issuedAt:number; expiresAt:number } | { ok:false; code:QrValidationCode };

function ensureSecret(secret:string){if(secret.length<32)throw new Error("QR secret must contain at least 32 characters");}
function signature(secret:string,prefix:string,encodedPayload:string){ensureSecret(secret);return createHmac("sha256",secret).update(`${prefix}.${encodedPayload}`).digest("base64url");}
function safeEqual(left:string,right:string){const a=Buffer.from(left);const b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}

function signPayload(secret:string,prefix:string,purpose:QrPurpose,reference:string,ttlSeconds:number,nowMs=Date.now()){ensureSecret(secret);const issuedAt=Math.floor(nowMs/1000);const payload:SignedPayload={p:purpose,v:prefix===MEMBER_PREFIX?1:2,ref:reference,iat:issuedAt,exp:issuedAt+ttlSeconds,nonce:randomUUID()};const encodedPayload=Buffer.from(JSON.stringify(payload)).toString("base64url");return{token:`${prefix}.${encodedPayload}.${signature(secret,prefix,encodedPayload)}`,expiresAt:payload.exp};}

function validatePayload(secret:string,token:string,prefix:string,purpose:QrPurpose,nowMs=Date.now()):QrValidationResult{const parts=token.trim().split(".");if(parts.length!==3)return{ok:false,code:"invalid_token"};const[actualPrefix,encodedPayload,actualSignature]=parts;if(actualPrefix!==prefix){if([MEMBER_PREFIX,TICKET_PREFIX,LEGACY_TICKET_PREFIX].includes(actualPrefix))return{ok:false,code:"wrong_qr_type"};return{ok:false,code:"invalid_token"};}if(!safeEqual(actualSignature,signature(secret,prefix,encodedPayload)))return{ok:false,code:"invalid_token"};try{const parsed=payloadSchema.safeParse(JSON.parse(Buffer.from(encodedPayload,"base64url").toString("utf8")));if(!parsed.success)return{ok:false,code:"invalid_token"};if(parsed.data.p!==purpose)return{ok:false,code:"wrong_qr_type"};const expectedVersion=prefix===MEMBER_PREFIX?1:2;if(parsed.data.v!==expectedVersion)return{ok:false,code:"invalid_token"};if(parsed.data.exp<=Math.floor(nowMs/1000))return{ok:false,code:"expired_token"};if(parsed.data.iat>Math.floor(nowMs/1000)+30)return{ok:false,code:"invalid_token"};return{ok:true,reference:parsed.data.ref,issuedAt:parsed.data.iat,expiresAt:parsed.data.exp};}catch{return{ok:false,code:"invalid_token"};}}

export function signMemberAttendanceWithSecret(secret:string,memberRef:string,ttlSeconds=90,nowMs=Date.now()){return signPayload(secret,MEMBER_PREFIX,"member_attendance",memberRef,ttlSeconds,nowMs);}
export function verifyMemberAttendanceWithSecret(secret:string,token:string,nowMs=Date.now()){return validatePayload(secret,token,MEMBER_PREFIX,"member_attendance",nowMs);}
export function signTicketWithSecret(secret:string,ticketId:string,ttlSeconds=DEFAULT_TICKET_TTL_SECONDS,nowMs=Date.now()){return signPayload(secret,TICKET_PREFIX,"event_ticket",ticketId,ttlSeconds,nowMs).token;}

function verifyLegacyTicket(secret:string,token:string):QrValidationResult{const parts=token.trim().split(".");if(parts.length!==3||parts[0]!==LEGACY_TICKET_PREFIX)return{ok:false,code:"invalid_token"};const[,ticketId,actualSignature]=parts;if(!z.string().uuid().safeParse(ticketId).success)return{ok:false,code:"invalid_token"};ensureSecret(secret);const expected=createHmac("sha256",secret).update(ticketId).digest("base64url");return safeEqual(actualSignature,expected)?{ok:true,reference:ticketId,issuedAt:0,expiresAt:0}:{ok:false,code:"invalid_token"};}

export function verifyTicketTokenWithSecret(secret:string,token:string,nowMs=Date.now()):QrValidationResult{if(token.trim().startsWith(`${MEMBER_PREFIX}.`))return{ok:false,code:"wrong_qr_type"};if(token.trim().startsWith(`${LEGACY_TICKET_PREFIX}.`))return verifyLegacyTicket(secret,token);return validatePayload(secret,token,TICKET_PREFIX,"event_ticket",nowMs);}
export function qrTokenFingerprint(token:string){return createHash("sha256").update(token.trim()).digest("hex");}
export function detectQrPurpose(token:string):QrPurpose|"unknown"{const prefix=token.trim().split(".",1)[0];if(prefix===MEMBER_PREFIX)return"member_attendance";if(prefix===TICKET_PREFIX||prefix===LEGACY_TICKET_PREFIX)return"event_ticket";return"unknown";}
