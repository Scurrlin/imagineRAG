import { cosineSimilarity } from '../libs/utils';

describe('cosineSimilarity', () => {
	it('returns 1 for identical vectors', () => {
		const v = [1, 2, 3];
		expect(cosineSimilarity(v, v)).toBeCloseTo(1);
	});

	it('returns -1 for opposite vectors', () => {
		const a = [1, 0, 0];
		const b = [-1, 0, 0];
		expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
	});

	it('returns 0 for orthogonal vectors', () => {
		const a = [1, 0];
		const b = [0, 1];
		expect(cosineSimilarity(a, b)).toBeCloseTo(0);
	});

	it('returns 0 for zero vectors', () => {
		const zero = [0, 0, 0];
		const v = [1, 2, 3];
		expect(cosineSimilarity(zero, v)).toBe(0);
	});

	it('throws when vector lengths differ', () => {
		expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
			'Vectors must have the same length'
		);
	});

	it('handles high-dimensional vectors', () => {
		const dim = 512;
		const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
		const b = Array.from({ length: dim }, (_, i) => Math.sin(i));
		expect(cosineSimilarity(a, b)).toBeCloseTo(1);
	});
});
