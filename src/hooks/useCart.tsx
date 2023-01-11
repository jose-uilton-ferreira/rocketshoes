import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

const CartLocalStorageKey = "@RocketShoes:cart";

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
    const storagedCart = localStorage.getItem(CartLocalStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get(`/stocks/${productId}`);
      const stock = responseStock.data.stock as Stock;

      const productIndex = cart.findIndex((product) => product.id === productId);
      const newCart = [...cart];
      
      if (stock.amount < 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productIndex !== -1) {
        const selectedProduct = newCart[productIndex];

        
        if (selectedProduct.amount + 1 > stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        selectedProduct.amount++;
        
        setCart(newCart);
        localStorage.setItem(CartLocalStorageKey, JSON.stringify(newCart));

        return;
      }

      const responseProduct = await api.get(`/products/${productId}`);
      const product = responseProduct.data.product as Product;
      product.amount = 1;

      newCart.push(product);

      setCart([...newCart]);
      localStorage.setItem(CartLocalStorageKey, JSON.stringify(newCart));

    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((product) => product.id === productId);

      if (productIndex < 0) {
        throw new Error();
      }

      setCart((state) => {
        const newCart = state.filter((product) => product.id !== productId);
        localStorage.setItem(CartLocalStorageKey, JSON.stringify(newCart));
        return newCart;
      } );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      if (amount <= 0) return;

      const responseStock = await api.get(`/stocks/${productId}`);
      const stock = responseStock.data.stock as Stock;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productIndex = cart.findIndex((product) => product.id === productId);

      setCart((state) => {
        state[productIndex].amount = amount;
        localStorage.setItem(CartLocalStorageKey, JSON.stringify(state));
        return [...state];
      })


    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  };

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
