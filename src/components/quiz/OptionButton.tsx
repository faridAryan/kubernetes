import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  option: string;
  selected: boolean;
  result: { correctAnswer: string | string[] } | null;
  disabled: boolean;
  onClick: () => void;
}

export default function OptionButton({ option, selected, result, disabled, onClick }: Props) {
  const correctAnswer = result?.correctAnswer;
  const isCorrectAnswer = Array.isArray(correctAnswer)
    ? correctAnswer.includes(option)
    : correctAnswer === option;

  let style = "border-kube-700 bg-kube-800/50";
  if (result && isCorrectAnswer) style = "border-accent-green/50 bg-accent-green/10";
  else if (result && selected) style = "border-accent-red/50 bg-accent-red/10";
  else if (selected) style = "border-kube-500 bg-kube-500/10";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border ${style} transition-all ${
        disabled ? "" : "hover:border-kube-500 hover:bg-kube-800/80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? "border-kube-500" : "border-kube-600"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-kube-500" />}
        </div>
        <span className="text-sm text-kube-200">{option}</span>
        {result && isCorrectAnswer && <CheckCircle2 size={16} className="text-accent-green ml-auto" />}
        {result && selected && isCorrectAnswer === false && (
          <XCircle size={16} className="text-accent-red ml-auto" />
        )}
      </div>
    </button>
  );
}
