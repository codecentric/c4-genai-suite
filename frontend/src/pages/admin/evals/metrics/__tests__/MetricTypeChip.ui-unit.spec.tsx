import { describe, expect, it } from 'vitest';
import { texts } from 'src/texts';
import { render, screen } from '../../../test-utils';
import { MetricTypeChip } from '../components/MetricTypeChip';

describe('MetricTypeChip', () => {
  it('should render Answer Relevancy chip with blue color', () => {
    render(<MetricTypeChip type="ANSWER_RELEVANCY" />);

    const text = screen.getByText(texts.evals.metric.typeAnswerRelevancy);
    expect(text).toBeInTheDocument();

    const chip = text.closest('.badge');
    expect(chip).toHaveClass('badge-info');
  });

  it('should render Faithfulness chip with green color', () => {
    render(<MetricTypeChip type="FAITHFULNESS" />);

    const text = screen.getByText(texts.evals.metric.typeFaithfulness);
    expect(text).toBeInTheDocument();

    const chip = text.closest('.badge');
    expect(chip).toHaveClass('badge-success');
  });

  it('should render Hallucination chip with red color', () => {
    render(<MetricTypeChip type="HALLUCINATION" />);

    const text = screen.getByText(texts.evals.metric.typeHallucination);
    expect(text).toBeInTheDocument();

    const chip = text.closest('.badge');
    expect(chip).toHaveClass('badge-error');
  });

  it('should render G-Eval chip with purple color', () => {
    render(<MetricTypeChip type="G_EVAL" />);

    const text = screen.getByText(texts.evals.metric.typeGEval);
    expect(text).toBeInTheDocument();

    const chip = text.closest('.badge');
    expect(chip).toHaveClass('badge-secondary');
  });
});
