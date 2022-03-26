import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {

    try {

      let newCart = [...cart];

      const responseProductStock = await api.get(`/stock/${productId}`);

      const productStock = responseProductStock.data.amount;
      let existsProductInCart = false;

      for (let product of newCart) {
        if (product.id === productId) {

          if (product.amount + 1 > productStock) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }

          product.amount++;
          existsProductInCart = true;
          break;
        }
      }

      if (!existsProductInCart) {
        if (productStock < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const selectedProduct = (await api.get(`/products/${productId}`)).data;
        selectedProduct.amount = 1;
        newCart.push(selectedProduct);
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch (e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      let index = -1;
      let newCart = [...cart];

      for (let i = 0; i < cart.length; i++) {
        if (cart[i].id === productId) {
          index = i;
          break;
        }
      }

      if (index === -1) throw new Error();

      newCart.splice(index, 1);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      if (amount <= 0) return;

      let productStock = (await api.get(`/stock/${productId}`)).data.amount;

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let selectedProduct = {} as Product;
      let newCart = [...cart];

      for (let product of cart) {
        if (product.id === productId) {
          selectedProduct = product;
          break;
        }
      }

      selectedProduct.amount = amount;
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
