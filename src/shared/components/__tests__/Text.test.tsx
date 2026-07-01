import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from '../Text'

test('renders text content', () => {
  const { getByText } = render(<Text>Hello</Text>)
  expect(getByText('Hello')).toBeTruthy()
})

test('applies display variant font size', () => {
  const { getByText } = render(<Text variant="display">Big</Text>)
  const el = getByText('Big')
  const style = el.props.style
  const flatStyle = Array.isArray(style) ? style : [style]
  expect(flatStyle).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontSize: 24 })]),
  )
})
