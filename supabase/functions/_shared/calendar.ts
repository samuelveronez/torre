export type ResponseStatus='accepted'|'tentative'|'needsAction'|'declined';
type Attendee={email?:string;self?:boolean;responseStatus?:string};
const statuses=new Set(['accepted','tentative','needsAction','declined']);
// `self` refers to the owner of this calendar copy, not necessarily our account.
export function invitationResponse(event:{attendees?:Attendee[]},email:string|null,calendarId:string):ResponseStatus|null{
 const account=email?.trim().toLowerCase();
 const attendee=account?event.attendees?.find(a=>a.email?.toLowerCase()===account)??(calendarId.toLowerCase()===account?event.attendees?.find(a=>a.self):undefined):undefined;
 return attendee?.responseStatus&&statuses.has(attendee.responseStatus)?attendee.responseStatus as ResponseStatus:null;
}
export function blocksPlanning(calendarBlocks:boolean,transparency:string|undefined,response:ResponseStatus|null){
 return calendarBlocks&&transparency!=='transparent'&&response!=='declined';
}
