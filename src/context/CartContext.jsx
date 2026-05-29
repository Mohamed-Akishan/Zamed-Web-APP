// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [shippingFee, setShippingFee] = useState(5)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  const [taxRate, setTaxRate] = useState(10)
  const [currencySymbol, setCurrencySymbol] = useState("$")

  // Load settings
  useEffect(() => {
    const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}')
    setShippingFee(siteSettings.shippingFee || 5)
    setFreeShippingThreshold(siteSettings.freeShippingThreshold || 100)
    setTaxRate(siteSettings.taxRate || 10)
    
    const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" }
    setCurrencySymbol(symbols[siteSettings.currency] || "$")
  }, [])

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('guestCart')
      if (savedCart) {
        setCartItems(JSON.parse(savedCart))
      }
      
      const user = localStorage.getItem('user')
      if (user) {
        setIsAuthenticated(true)
        const userData = JSON.parse(user)
        const userCart = localStorage.getItem(`cart_${userData.email}`)
        if (userCart) {
          setCartItems(JSON.parse(userCart))
        }
      }
    } catch (e) {
      console.error("Error loading cart:", e)
      setCartItems([])
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      if (isAuthenticated) {
        const user = localStorage.getItem('user')
        if (user) {
          const userData = JSON.parse(user)
          localStorage.setItem(`cart_${userData.email}`, JSON.stringify(cartItems))
        }
      } else {
        localStorage.setItem('guestCart', JSON.stringify(cartItems))
      }
    } catch (e) {
      console.error("Error saving cart:", e)
    }
  }, [cartItems, isAuthenticated])

  const addToCart = (product) => {
    if (!product) return;
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.id === product.id && 
        item.size === product.size && 
        item.color === product.color
      )
      
      if (existingItem) {
        const updatedItems = prevItems.map(item =>
          item.id === product.id && item.size === product.size && item.color === product.color
            ? { ...item, quantity: (item.quantity || 1) + (product.quantity || 1) }
            : item
        )
        toast.success(`Added another ${product.name} to cart!`)
        return updatedItems
      }
      
      toast.success(`${product.name} added to cart!`)
      return [...prevItems, { ...product, quantity: product.quantity || 1 }]
    })
  }

  const removeFromCart = (productId, size, color) => {
    if (!productId) return;
    
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => 
        item.id === productId && 
        item.size === size && 
        item.color === color
      )
      
      if (itemToRemove) {
        toast.error(`${itemToRemove.name} removed from cart`)
      }
      
      return prevItems.filter(item => 
        !(item.id === productId && item.size === size && item.color === color)
      )
    })
  }

  const updateQuantity = (productId, size, color, quantity) => {
    if (!productId) return;
    
    if (quantity <= 0) {
      removeFromCart(productId, size, color)
      return
    }
    
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        localStorage.removeItem(`cart_${userData.email}`)
      } catch (e) {}
    } else {
      localStorage.removeItem('guestCart')
    }
    toast.success('Cart cleared')
  }

  const getCartTotal = () => {
    if (!cartItems || cartItems.length === 0) return 0
    return cartItems.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0)
  }

  const getCartItemsCount = () => {
    if (!cartItems || cartItems.length === 0) return 0
    return cartItems.reduce((total, item) => total + (item.quantity || 1), 0)
  }

  const getShippingFee = () => {
    const subtotal = getCartTotal()
    return subtotal > freeShippingThreshold ? 0 : shippingFee
  }

  const getTax = () => {
    const subtotal = getCartTotal()
    return subtotal * (taxRate / 100)
  }

  const getGrandTotal = () => {
    const subtotal = getCartTotal()
    const shipping = getShippingFee()
    const tax = getTax()
    return subtotal + shipping + tax
  }

  const mergeGuestCart = (userEmail) => {
    try {
      const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]')
      const userCart = JSON.parse(localStorage.getItem(`cart_${userEmail}`) || '[]')
      
      const mergedCart = [...userCart]
      guestCart.forEach(guestItem => {
        const existingItem = mergedCart.find(item => 
          item.id === guestItem.id && 
          item.size === guestItem.size && 
          item.color === guestItem.color
        )
        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + (guestItem.quantity || 1)
        } else {
          mergedCart.push(guestItem)
        }
      })
      
      setCartItems(mergedCart)
      localStorage.setItem(`cart_${userEmail}`, JSON.stringify(mergedCart))
      localStorage.removeItem('guestCart')
      setIsAuthenticated(true)
    } catch (e) {
      console.error("Error merging cart:", e)
    }
  }

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartItemsCount,
      getShippingFee,
      getTax,
      getGrandTotal,
      shippingFee,
      freeShippingThreshold,
      taxRate,
      currencySymbol,
      mergeGuestCart,
      isAuthenticated,
      setIsAuthenticated
    }}>
      {children}
    </CartContext.Provider>
  )
}