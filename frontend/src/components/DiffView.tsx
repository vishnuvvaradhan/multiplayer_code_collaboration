import { FileCode, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface DiffViewProps {
  prLink?: string;
}

export function DiffView({ prLink }: DiffViewProps) {
  return (
    <div className="p-6 space-y-4">
      {/* PR Link if available */}
      {prLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-1">Pull Request Created</h4>
              <p className="text-xs text-green-700">View the full diff and changes on GitHub</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(prLink, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View PR
            </Button>
          </div>
        </div>
      )}
      {/* File 1 */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white">PaymentForm.tsx</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-green-400">+23</span>
            <span className="text-red-400">-8</span>
          </div>
        </div>
        <div className="p-4 font-mono text-xs overflow-x-auto">
          <div className="space-y-0.5">
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">12</span>
              import {`{ useState }`} from &apos;react&apos;;
            </div>
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">13</span>
              import {`{ Button }`} from &apos;./ui/button&apos;;
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">14</span>
              +import {`{ validateCardNumber, validateCVV }`} from &apos;./validation&apos;;
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">15</span>
              +import {`{ ErrorMessage }`} from &apos;./ErrorMessage&apos;;
            </div>
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">16</span>
            </div>
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">17</span>
              export function PaymentForm() {'{'}
            </div>
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">18</span>
              {'  '}const [cardNumber, setCardNumber] = useState(&apos;&apos;);
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">19</span>
              + {'  '}const [errors, setErrors] = useState({'{}'});
            </div>
            <div className="text-gray-400">
              <span className="text-gray-600 select-none mr-3">20</span>
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">21</span>
              + {'  '}const handleCardBlur = () ={'> {'}
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">22</span>
              + {'    '}const error = validateCardNumber(cardNumber);
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">23</span>
              + {'    '}setErrors({'{...errors, card: error }'});
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">24</span>
              + {'  }'}
            </div>
          </div>
        </div>
      </div>

      {/* File 2 */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white">validation.ts</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-green-400">+18</span>
            <span className="text-red-400">-0</span>
          </div>
        </div>
        <div className="p-4 font-mono text-xs overflow-x-auto">
          <div className="space-y-0.5">
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">1</span>
              +export function validateCardNumber(cardNumber: string): string | null {'{'}
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">2</span>
              + {'  '}if (!cardNumber) return &apos;Card number is required&apos;;
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">3</span>
              + {'  '}if (cardNumber.length {'<'} 16) return &apos;Card number must be 16 digits&apos;;
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">4</span>
              + {'  '}return null;
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">5</span>
              +{'}'}
            </div>
          </div>
        </div>
      </div>

      {/* File 3 */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white">ErrorMessage.tsx</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-green-400">+6</span>
            <span className="text-red-400">-4</span>
          </div>
        </div>
        <div className="p-4 font-mono text-xs overflow-x-auto">
          <div className="space-y-0.5">
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">1</span>
              +export function ErrorMessage({`{ message }: { message: string }`}) {'{'}
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">2</span>
              + {'  '}return (
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">3</span>
              + {'    '}{'<div className="text-red-600 text-sm mt-1">{message}</div>'}
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">4</span>
              + {'  '});
            </div>
            <div className="bg-green-900/20 text-green-300">
              <span className="text-green-600 select-none mr-3">5</span>
              +{'}'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
