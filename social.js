// ============================================================================
// Wallflow Radio — social.js
// Powers the "Friends" tab:
//   - a real friend-request system (send by "Name#1234", accept/decline)
//   - a mutual friends list once accepted
//   - a browsable "everyone" directory, live presence ("listening to X")
//   - a global activity feed
//   - per-station chat
//
// Same dual-backend approach as the Rooms feature in the main file:
//   - If firebase-config.js has real keys, it syncs across every device.
//   - If not, it still works locally across browser tabs on one device
//     (via BroadcastChannel + localStorage) so the app is fully demoable
//     with zero setup.
// ============================================================================
(function(){
  const BC_NAME = 'wallflow-social-sync';
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(BC_NAME) : null;
  function fbReady(){ return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0; }

  function clientUid(){
    let id = localStorage.getItem('wallflow_client_uid');
    if(!id){ id = 'u' + Math.random().toString(36).slice(2,10); localStorage.setItem('wallflow_client_uid', id); }
    return id;
  }

  const LS = {
    get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }catch(e){ return fallback; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); bc && bc.postMessage({key}); }
  };
  const K_USERS = 'wf_users', K_PRESENCE = 'wf_presence', K_ACTIVITY = 'wf_activity';
  const friendsKey = uid => 'wf_friends_' + uid;
  const requestsKey = uid => 'wf_requests_' + uid;
  const chatKey = station => 'wf_chat_' + station;

  function watchLocal(key, cb, pollMs, emptyObjNotArray){
    const poll = () => cb(LS.get(key, emptyObjNotArray ? {} : []));
    poll();
    const onMsg = e => { if(e.data && e.data.key === key) poll(); };
    bc && bc.addEventListener('message', onMsg);
    const iv = setInterval(poll, pollMs || 2000);
    return () => { bc && bc.removeEventListener('message', onMsg); clearInterval(iv); };
  }

  function syncProfile(session){
    const uid = clientUid();
    const profile = { name: session.name, hue: session.hue || 30, callSign: session.callSign || '', tag: session.tag || '0000' };
    if(fbReady()){
      firebase.database().ref('wf_users/' + uid).set(profile);
    } else {
      const users = LS.get(K_USERS, {});
      users[uid] = profile;
      LS.set(K_USERS, users);
    }
    return uid;
  }

  function listenAllUsers(cb){
    if(fbReady()){
      const ref = firebase.database().ref('wf_users');
      const handler = snap => cb(snap.val() || {});
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    return watchLocal(K_USERS, cb, 2000, true);
  }

  function findUidByNameTag(allUsers, myUid, nameTag){
    const m = /^(.+?)\s*#\s*(\d{3,4})$/.exec((nameTag||'').trim());
    if(!m) return { error: 'Enter it like Name#1234 (with the #).' };
    const wantName = m[1].trim().toLowerCase();
    const wantTag = m[2].trim();
    for(const uid of Object.keys(allUsers)){
      const u = allUsers[uid];
      if((u.name||'').trim().toLowerCase() === wantName && String(u.tag) === wantTag){
        if(uid === myUid) return { error: "That's your own ID!" };
        return { uid, profile: u };
      }
    }
    return { error: "No one found with that ID — double-check the name and tag." };
  }

  function sendFriendRequest(nameTag, myProfile){
    const myUid = clientUid();
    return new Promise(resolve => {
      function withUsers(allUsers){
        const result = findUidByNameTag(allUsers, myUid, nameTag);
        if(result.error){ resolve({ ok:false, error: result.error }); return; }
        const targetUid = result.uid;
        const req = { name: myProfile.name, tag: myProfile.tag, hue: myProfile.hue || 30, ts: Date.now() };
        if(fbReady()){
          firebase.database().ref('wf_friends/' + myUid + '/' + targetUid).get().then(snap => {
            if(snap.val()){ resolve({ ok:false, error: "You're already friends." }); return; }
            firebase.database().ref('wf_requests/' + targetUid + '/' + myUid).set(req)
              .then(() => resolve({ ok:true }));
          });
        } else {
          const friends = LS.get(friendsKey(myUid), {});
          if(friends[targetUid]){ resolve({ ok:false, error: "You're already friends." }); return; }
          const reqs = LS.get(requestsKey(targetUid), {});
          reqs[myUid] = req;
          LS.set(requestsKey(targetUid), reqs);
          resolve({ ok:true });
        }
      }
      if(fbReady()){
        firebase.database().ref('wf_users').get().then(snap => withUsers(snap.val() || {}));
      } else {
        withUsers(LS.get(K_USERS, {}));
      }
    });
  }

  function listenIncomingRequests(cb){
    const myUid = clientUid();
    if(fbReady()){
      const ref = firebase.database().ref('wf_requests/' + myUid);
      const handler = snap => cb(snap.val() || {});
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    return watchLocal(requestsKey(myUid), cb, 1500, true);
  }

  function acceptFriendRequest(fromUid){
    const myUid = clientUid();
    if(fbReady()){
      const db = firebase.database();
      db.ref('wf_friends/' + myUid + '/' + fromUid).set(true);
      db.ref('wf_friends/' + fromUid + '/' + myUid).set(true);
      db.ref('wf_requests/' + myUid + '/' + fromUid).remove();
    } else {
      const myFriends = LS.get(friendsKey(myUid), {}); myFriends[fromUid] = true; LS.set(friendsKey(myUid), myFriends);
      const theirFriends = LS.get(friendsKey(fromUid), {}); theirFriends[myUid] = true; LS.set(friendsKey(fromUid), theirFriends);
      const reqs = LS.get(requestsKey(myUid), {}); delete reqs[fromUid]; LS.set(requestsKey(myUid), reqs);
    }
  }

  function declineFriendRequest(fromUid){
    const myUid = clientUid();
    if(fbReady()){
      firebase.database().ref('wf_requests/' + myUid + '/' + fromUid).remove();
    } else {
      const reqs = LS.get(requestsKey(myUid), {}); delete reqs[fromUid]; LS.set(requestsKey(myUid), reqs);
    }
  }

  function removeFriend(otherUid){
    const myUid = clientUid();
    if(fbReady()){
      const db = firebase.database();
      db.ref('wf_friends/' + myUid + '/' + otherUid).remove();
      db.ref('wf_friends/' + otherUid + '/' + myUid).remove();
    } else {
      const mine = LS.get(friendsKey(myUid), {}); delete mine[otherUid]; LS.set(friendsKey(myUid), mine);
      const theirs = LS.get(friendsKey(otherUid), {}); delete theirs[myUid]; LS.set(friendsKey(otherUid), theirs);
    }
  }

  function listenMyFriends(cb){
    const myUid = clientUid();
    if(fbReady()){
      const ref = firebase.database().ref('wf_friends/' + myUid);
      const handler = snap => cb(snap.val() || {});
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    return watchLocal(friendsKey(myUid), cb, 2000, true);
  }

  function follow(uid){ acceptFriendRequest(uid); }
  function unfollow(uid){ removeFriend(uid); }

  function setPresence(session, stationName){
    const uid = clientUid();
    const data = { uid, name: session.name, hue: session.hue || 30, station: stationName, ts: Date.now() };
    if(fbReady()){
      const ref = firebase.database().ref('wf_presence/' + uid);
      ref.set(data);
      ref.onDisconnect().remove();
    } else {
      const presence = LS.get(K_PRESENCE, {});
      presence[uid] = data;
      LS.set(K_PRESENCE, presence);
    }
  }

  function listenPresence(cb){
    if(fbReady()){
      const ref = firebase.database().ref('wf_presence');
      const handler = snap => cb(snap.val() || {});
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    return watchLocal(K_PRESENCE, cb, 2000, true);
  }

  function logActivity(session, action, station){
    const entry = { name: session.name, hue: session.hue || 30, action, station, ts: Date.now() };
    if(fbReady()){
      firebase.database().ref('wf_activity').push(entry);
    } else {
      const list = LS.get(K_ACTIVITY, []);
      list.push(entry);
      LS.set(K_ACTIVITY, list.slice(-100));
    }
  }

  function listenActivity(cb, limit){
    limit = limit || 40;
    if(fbReady()){
      const ref = firebase.database().ref('wf_activity').limitToLast(limit);
      const handler = snap => {
        const list = Object.values(snap.val() || {}).sort((a,b)=>(b.ts||0)-(a.ts||0));
        cb(list);
      };
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    const poll = () => {
      const list = LS.get(K_ACTIVITY, []).slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0, limit);
      cb(list);
    };
    poll();
    const onMsg = e => { if(e.data && e.data.key === K_ACTIVITY) poll(); };
    bc && bc.addEventListener('message', onMsg);
    const iv = setInterval(poll, 2000);
    return () => { bc && bc.removeEventListener('message', onMsg); clearInterval(iv); };
  }

  function sendChatMessage(stationName, session, text){
    if(!text || !text.trim()) return;
    const msg = { name: session.name, hue: session.hue || 30, text: text.trim(), ts: Date.now() };
    if(fbReady()){
      firebase.database().ref('wf_chat/' + encodeURIComponent(stationName)).push(msg);
    } else {
      const key = chatKey(stationName);
      const list = LS.get(key, []);
      list.push(msg);
      LS.set(key, list.slice(-100));
    }
  }

  function listenChat(stationName, cb){
    if(fbReady()){
      const ref = firebase.database().ref('wf_chat/' + encodeURIComponent(stationName)).limitToLast(50);
      const handler = snap => {
        const list = Object.values(snap.val() || {}).sort((a,b)=>(a.ts||0)-(b.ts||0));
        cb(list);
      };
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }
    const key = chatKey(stationName);
    const poll = () => cb(LS.get(key, []).slice().sort((a,b)=>(a.ts||0)-(b.ts||0)));
    poll();
    const onMsg = e => { if(e.data && e.data.key === key) poll(); };
    bc && bc.addEventListener('message', onMsg);
    const iv = setInterval(poll, 1500);
    return () => { bc && bc.removeEventListener('message', onMsg); clearInterval(iv); };
  }

  window.WallflowSocial = {
    syncProfile, listenAllUsers,
    sendFriendRequest, listenIncomingRequests, acceptFriendRequest, declineFriendRequest,
    removeFriend, listenMyFriends, follow, unfollow,
    setPresence, listenPresence, logActivity, listenActivity,
    sendChatMessage, listenChat
  };
})();
