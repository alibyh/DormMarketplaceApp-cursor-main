import { render } from '@testing-library/react-native';
import ProductCard from '../../components/ProductCard/ProductCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'IconMock'
}));

describe('ProductCard', () => {
  test('renders product information correctly', () => {
    const { getByText } = render(
      <ProductCard 
        productName="Test Product"
        price="₽1000"
        dormNumber="1"
      />
    );

    expect(getByText('Test Product')).toBeTruthy();
    expect(getByText('₽1000')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });
});