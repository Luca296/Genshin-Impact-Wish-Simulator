import {proUser,showAd} from '$lib/store/app-stores';
export const adKey = {clear(){}, async initialLoad(){return {validity:false,status:'offline',storedKey:''}},async verify(){return {validity:false,msg:'connectionFailed'}}};
export const verifyKey=async()=>{proUser.set(false);showAd.set(false)};
