import { fireApp } from '@/plugins/firebase'

export const state = () => ({
  categories: [],
  products: [],
  product: null,
  productCategories: []
})

export const mutations = {
  loadCategories (state, payload) {
    state.categories.push(payload)
  },
  updateCategory (state, payload) {
    const i = state.categories.indexOf(payload.category)
    state.categories[i].name = payload.name
  },
  removeCategory (state, payload) {
    const i = state.categories.indexOf(payload.category)
    state.categories.splice(i, 1)
  },
  loadProducts (state, payload) {
    state.products = payload
  },
  loadProduct (state, payload) {
    state.product = payload
  },
  removeProduct (state, payload) {
    const i = state.products.indexOf(payload)
    state.products.splice(i, 1)
  },
  loadProductCategories (state, payload) {
    state.productCategories.push(payload)
  },
  clearProductCategories (state) {
    state.productCategories = []
  }
}

export const actions = {
  createCategory ({commit}, payload) {
    commit('setBusy', true, { root: true })
    commit('clearError', null, { root: true })
    fireApp.database().ref('categories').push(payload)
      .then(() => {
        commit('setBusy', false, { root: true })
        commit('setJobDone', true, { root: true })
      })
      .catch(error => {
        commit('setBusy', false, { root: true })
        commit('setError', error, { root: true })
      })
  },
  getCategories ({commit}) {
    fireApp.database().ref('categories').on('child_added',
      snapShot => {
        let item = snapShot.val()
        item.key = snapShot.key
        commit('loadCategories', item)
      })
  },
  updateCategory ({commit}, payload) {
    commit('setBusy', true, { root: true })
    commit('clearError', null, { root: true })          
    fireApp.database().ref(`categories/${payload.category.key}`).update({ name: payload.name })
      .then(() => {        
        commit('setBusy', false, { root: true })
        commit('setJobDone', true, { root: true })
        const categoryData = {
          category: payload.category,
          name: payload.name
        }
        commit('updateCategory', categoryData)
      })
      .catch(error => {        
        commit('setBusy', false, { root: true })
        commit('setError', error, { root: true })
      })
  },
  removeCategory ({commit}, payload) {
    fireApp.database().ref(`categories/${payload.category.key}`).remove()
      .then(() => {
        commit('removeCategory', payload)
      })
      .catch(error => {
        console.log(error)
      })
  },
  addProduct ({dispatch, commit}, payload) {
    const productData = payload
    const categories = payload.belongs
    const image = payload.image
    let imageUrl = ''
    let productKey = ''
    delete productData.belongs
    delete productData.image

    commit('setBusy', true, { root: true })
    commit('clearError', null, { root: true })
    fireApp.database().ref('products').push(productData)      
      .then(result => {
        productKey = result.key
        return fireApp.storage().ref(`products/${image.name}`).put(image)
      })
      .then(fileData => {
        imageUrl = fileData.metadata.downloadURLs[0]
        return fireApp.database().ref('products').child(productKey).update({imageUrl: imageUrl})
      })
      .then(() => {
        const productSnippet = {
          name: productData.name,
          price: productData.price,
          status: productData.status,
          imageUrl: imageUrl
        }
        let catUpdates = {}
        categories.forEach(catKey => {
          catUpdates[`productCategories/${catKey}/${productKey}`] = productSnippet
        })
        return fireApp.database().ref().update(catUpdates)
      })
      .then(() => {
        dispatch('getProducts')
        commit('setBusy', false, { root: true })
        commit('setJobDone', true, { root: true })
      })
      .catch(error => {
        commit('setBusy', false, { root: true })
        commit('setError', error, { root: true })
      })
  },
  getProducts ({commit}) {
    fireApp.database().ref('products').once('value')
      .then(snapShot => {
        const products = []
        let item = {}
        snapShot.forEach(child => {
          item = child.val()
          item.key = child.key
          products.push(item)
        })
        commit('loadProducts', products.reverse())
      })
  },
  removeProduct ({commit}, payload) {
    // https://firebasestorage.googleapis.com/v0/b/nuxt-3170f.appspot.com/o/products%2Fglimpse.jpg?alt=media&token=1650b58c-74ff-4040-a284-f919a671dbd9
    // 1. Remove form storage
    // 2. Remove from products
    // 3. Remove from productCategories     
    const imageUrl = payload.imageUrl
    const refUrl = imageUrl.split('?')[0]
    const httpsRef = fireApp.storage().refFromURL(refUrl)
    httpsRef.delete()
      .then(() => {
        return fireApp.database().ref(`products/${payload.key}`).remove()
          .then(() => {
            return fireApp.database().ref('categories').once('value')
              .then(snapShot => {
                const catKeys = Object.keys(snapShot.val())
                let updates = {}
                catKeys.forEach(key => {
                  updates[`productCategories/${key}/${payload.key}`] = null
                })    
                return fireApp.database().ref().update(updates)
              })
          })
      })
      .then(() => {
        commit('removeProduct', payload)
      })
      .catch(error => {
        console.log(error)
      })
  },
  updateProduct ({dispatch, commit}, payload) {
    const productData = payload
    const categories = productData.belongs
    const image = payload.image    
    const productKey = payload.key
    let oldImageUrl = null
    let oldCatsRemoval = {}
    delete productData.belongs // Goes to productCategories
    delete productData.image // Goes to storage       
    
    commit('setBusy', true, { root: true })
    commit('clearError', null, { root: true })
    fireApp.database().ref(`products/${productKey}`).update(productData)  // Update products data with updated product detail 
      .then(() => { // Upload image if new image provided
        if (image) {
          return fireApp.storage().ref(`products/${image.name}`).put(image)
        } else {
          return false
        }
      })
      .then(fileData => { // Update products data with new image url
        if (fileData) {   
          oldImageUrl = productData.oldImageUrl       
          productData.imageUrl = fileData.metadata.downloadURLs[0]
          return fireApp.database().ref('products').child(productKey).update({imageUrl: productData.imageUrl})
        } 
      })
      .then(() => { // Remove old image if new image uploaded and old image exists        
        if (oldImageUrl) {
          const refUrl = oldImageUrl.split('?')[0]
          const httpsRef = fireApp.storage().refFromURL(refUrl)          
          return httpsRef.delete()  
        }
      })
      .then(() => { // Prepare batch removal of product-categories attachments
        return fireApp.database().ref('productCategories').on('child_added',
          snapShot => {                        
            oldCatsRemoval[`productCategories/${snapShot.key}/${productKey}`] = null            
          })
      })
      .then(() => { // Execute removal of product-categories attachments
        return fireApp.database().ref().update(oldCatsRemoval)
      })
      .then(() => { // Add new product-categories attachments           
        const productSnippet = {
          name: productData.name,
          imageUrl: productData.imageUrl,
          price: productData.price,
          status: productData.status
        }        
        let catUpdates = {}   
        categories.forEach(catKey => {
          catUpdates[`productCategories/${catKey}/${productKey}`] = productSnippet
        })        
        return fireApp.database().ref().update(catUpdates)
      })
      .then(() => {    
        dispatch('getProducts') // Dispatch getProducts to refresh the products list
        commit('setBusy', false, { root: true })
        commit('setJobDone', true, { root: true })
      })
      .catch(error => {
        commit('setBusy', false, { root: true })
        commit('setError', error, { root: true })
      })
  },
  productCategories ({commit}, payload) {
    commit('clearProductCategories')
    fireApp.database().ref('productCategories').on('child_added',
      snapShot => {
        let item = snapShot.val()
        item.key = snapShot.key
        if (item[payload] !== undefined) {          
          commit('loadProductCategories', item.key)
        }
      }
    )
  }
}

export const getters = {
  categories (state) {
    return state.categories
  },
  products (state) {
    return state.products
  },
  product (state) {
    return state.product
  },
  productCategories (state) {
    return state.productCategories
  }
}