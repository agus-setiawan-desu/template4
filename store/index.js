import { fireApp }  from '@/plugins/firebase'

export const state = () => ({
  user: null,
  error: null,
  busy: false,
  jobDone: false,
  forwardRoute: null
})

export const mutations = {
  setUser (state, payload) {
    state.user = payload
  },
  setError (state, payload) {
    state.error = payload
  },
  clearError (state) {
    state.error = null
  },
  setBusy (state, payload) {
    state.busy = payload
  },
  setJobDone (state, payload) {
    state.jobDone = payload
  },
  setForwardRoute (state, payload) {
    state.forwardRoute = payload
  }
}

export const actions = {
  signUpUser ({commit}, payload) {
    commit('setBusy', true)
    commit('clearError')
    // 1. Signup new user
    // 2. Update firebase user profile & set local user data
    // 3. Add user data into database
    // 4. Attach user to consumer group
    let newUser = null
    fireApp.auth().createUserWithEmailAndPassword(payload.email, payload.password)
      .then(user => {
        newUser = user
        return user.updateProfile({ displayName: payload.fullname })
          .then(() => {
            const currentUser = {
              id: user.uid,
              email: payload.email,
              name: payload.fullname,
              role: 'consumer'
            }
            console.log('USER', currentUser)
            commit('setUser', currentUser)
          })        
      })
      .then(() => {
        const userData = {
          email: payload.email,
          fullname: payload.fullname,
          createdAt: new Date().toISOString()
        }
        return fireApp.database().ref(`users/${newUser.uid}`).set(userData)
      })
      .then(() => {
        return fireApp.database().ref('groups').orderByChild('name').equalTo('Customer').once('value')
          .then(snapShot => {
            const groupKey = Object.keys(snapShot.val())[0]
            let groupedUser = {}
            groupedUser[newUser.uid] = payload.fullname
            return fireApp.database().ref(`userGroups/${groupKey}`).update(groupedUser)
          })
      })
      .then(() => {
        commit('setJobDone', true)
        commit('setBusy', false)
      })
      .catch(error => {
        commit('setBusy', false)
        commit('setError', error)
      })
  },
  loginUser ({commit}, payload) {
    commit('setBusy', true)
    commit('clearError')
    // 1. Login user
    // 2. Find the group user belongs
    // 3. Set logged in user
    fireApp.auth().signInWithEmailAndPassword(payload.email, payload.password)
      .then(user => {
        const authUser = {
          id: user.uid,
          email: user.email,
          name: user.displayName
        }
        return fireApp.database().ref('groups').orderByChild('name').equalTo('Administrator').once('value')
          .then(snapShot => {
            const groupKey = Object.keys(snapShot.val())[0]
            return fireApp.database().ref(`userGroups/${groupKey}`).child(`${authUser.id}`).once('value')
              .then(ugroupSnap => {
                if (ugroupSnap.exists()) {
                  authUser.role = 'admin'
                } else {
                  authUser.role = 'customer'
                }
                commit('setUser', authUser)
                commit('setBusy', false)
                commit('setJobDone', true)
              })
          })
      })
      .catch(error => {
        commit('setBusy', false)
        commit('setError', error)
      })
  },
  logOut ({commit}) {
    fireApp.auth().signOut()
    commit('setUser', null)
  },
  setAuthStatus ({commit}) {
    fireApp.auth().onAuthStateChanged((user) => {
      if (user) {
        const authUser = {
          id: user.uid,
          email: user.email,
          name: user.displayName
        }
        fireApp.database().ref('groups').orderByChild('name').equalTo('Administrator').once('value')
          .then(snapShot => {
            const groupKey = Object.keys(snapShot.val())[0]
            fireApp.database().ref(`userGroups/${groupKey}`).child(`${authUser.id}`).once('value')
              .then(uGroupSnap => {
                if (uGroupSnap.exists()) {
                  authUser.role = 'admin'
                } else {
                  authUser.role = 'customer'
                }
                commit('setUser', authUser)
              })
          })
      }
    })
  },
  updateProfile ({commit, getters}, payload) {
    // 1. Update user name with updateProfile
    // 2. Update user email with updateEmail
    // 3. Update the database
    // 4. Will divide the code into chunks
    // -L8cCHJYQtgSs-fgaTHZ , -L8cCJUxYnR7OuCDAL6n
    commit('setBusy', true)
    commit('clearError')
    const userData = getters.user
    const user = fireApp.auth().currentUser
    const updateEmail = () => {
      return user.updateEmail(payload.email)
    }
    const updateDb = () => {
      const updateObj = {}
      if (userData.role == 'admin') {
        updateObj[`userGroups/-L8cCHJYQtgSs-fgaTHZ/${user.uid}`] = payload.fullname
      }
      updateObj[`userGroups/-L8cCJUxYnR7OuCDAL6n/${user.uid}`] = payload.fullname
      updateObj[`users/${user.uid}/email`] = payload.email
      updateObj[`users/${user.uid}/fullname`] = payload.fullname
      return fireApp.database().ref().update(updateObj)
    }
    user.updateProfile({displayName: payload.fullname})
      .then(updateEmail)
      .then(updateDb)
      .then(() => {        
        const userObj = {
          id: userData.id,
          email: payload.email,
          name: payload.fullname,
          role: userData.role
        }
        commit('setUser', userObj)
        commit('setBusy', false)
        commit('setJobDone', true)
      })
      .catch(error => {
        commit('setBusy', false)
        commit('setError', error)
      })        
  },
  changePwd ({commit}, payload) {
    commit('setBusy', true)
    commit('clearError')
    const user = fireApp.auth().currentUser
    user.updatePassword(payload.password)
      .then(() => {
        commit('setBusy', false)
        commit('setJobDone', true)
      })
      .catch(error => {
        commit('setBusy', false)
        commit('setError', error)
      })
  }
}

export const getters = {
  user (state) {
    return state.user
  },
  loginStatus (state) {
    return state.user !== null && state.user !== undefined
  },
  userRole (state) {
    const isLoggedIn = state.user !== null && state.user !== undefined
    return (isLoggedIn) ? state.user.role : 'customer'
  },
  error (state) {
    return state.error
  },
  busy (state) {
    return state.busy
  },
  jobDone (state) {
    return state.jobDone
  },
  forwardRoute (state) {
    return state.forwardRoute
  }
}