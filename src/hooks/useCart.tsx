import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isProductOnCart = [...cart].find(product => product.id === productId)

      if ( !!isProductOnCart?.id ) {
        updateProductAmount(({
          productId: productId,
          amount: isProductOnCart.amount + 1
        }));
        return
      }

      const newCartItem = (await api.get(`/products/${productId}`)).data

      if( !newCartItem?.id ) {
        throw new Error("Erro na adição do produto");
      };

      newCartItem.amount = 1

      const newCart = [...cart, newCartItem]

      setCart(newCart)
      updateLocalStorageCart(newCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId)
      if( !isProductOnCart?.id ) {
        throw new Error("Erro na remoção do produto");
      }

      const newCart = cart.filter(product => product.id !== productId)

      setCart(newCart)
      updateLocalStorageCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if( amount <= 0 ) return false

      const isProductOnCart = cart.find(product => product.id === productId)
      if( !isProductOnCart?.id ) {
        toast.error('Erro na alteração de quantidade do produto')
        return
      }

      const totalProductsAtStockById:Stock = (await api.get(`/stock/${productId}`)).data

      if( amount > totalProductsAtStockById.amount ) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const newCart = cart.map( product => {
        if( product.id === productId )
          product.amount = amount
          
        return product
      })

      setCart(newCart)
      updateLocalStorageCart(newCart)
    } catch {
      toast.error('Quantidade solicitada fora de estoque')
    }
  };

  const updateLocalStorageCart = (newCart: Product[]) =>{
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
