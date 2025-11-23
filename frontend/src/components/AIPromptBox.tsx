"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { 
  Paperclip, 
  Smile, 
  AtSign, 
  Send, 
  X, 
  Image as ImageIcon,
  FileText,
  Code,
  Sparkles,
  Loader2,
  Search
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getUserColor, getUserInitials } from '@/lib/database';

interface AIPromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  placeholder?: string;
  participants?: string[];
  onAttachFile?: (file: File) => void;
  onMention?: (userId: string) => void;
  onSearch?: () => void;
  maxLength?: number;
}

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🤨', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

export function AIPromptBox({
  value,
  onChange,
  onSend,
  sending = false,
  placeholder = "Write a message...",
  participants = [],
  onAttachFile,
  onMention,
  onSearch,
  maxLength = 2000,
}: AIPromptBoxProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Handle mention detection
  useEffect(() => {
    if (isFocused && value) {
      const lastChar = value[value.length - 1];
      const lastAtIndex = value.lastIndexOf('@');
      
      if (lastChar === '@' || (lastAtIndex !== -1 && lastAtIndex < value.length - 1)) {
        const textAfterAt = value.substring(lastAtIndex + 1);
        const spaceIndex = textAfterAt.indexOf(' ');
        
        if (spaceIndex === -1 || spaceIndex > 0) {
          setMentionQuery(textAfterAt.split(' ')[0]);
          setShowMentionPicker(true);
        } else {
          setShowMentionPicker(false);
        }
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  }, [value, isFocused]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (mentionPickerRef.current && !mentionPickerRef.current.contains(event.target as Node)) {
        setShowMentionPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !sending) {
        onSend();
      }
    }
    // Escape to close pickers
    if (e.key === 'Escape') {
      setShowEmojiPicker(false);
      setShowMentionPicker(false);
    }
    // Arrow keys in mention picker
    if (showMentionPicker && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      // Handle arrow key navigation in mention picker
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + emoji + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  const handleMentionClick = (participant: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const beforeAt = value.substring(0, lastAtIndex);
        const afterAt = value.substring(lastAtIndex + 1 + mentionQuery.length);
        const newValue = `${beforeAt}@${participant} ${afterAt}`;
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(beforeAt.length + participant.length + 2, beforeAt.length + participant.length + 2);
        }, 0);
      }
    }
    setShowMentionPicker(false);
    if (onMention) {
      onMention(participant);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...attachedFiles, ...files];
      setAttachedFiles(newFiles);
      if (onAttachFile) {
        files.forEach(file => onAttachFile(file));
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const filteredParticipants = participants.filter(p => 
    p.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className="relative">
      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-gray-600" />
              ) : (
                <FileText className="w-4 h-4 text-gray-600" />
              )}
              <span className="text-gray-700 truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div
        className="mx-4 mb-4 rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: isFocused
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isFocused
            ? '2px solid rgba(59, 130, 246, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: isFocused
            ? '0 12px 40px 0 rgba(31, 38, 135, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        }}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  onChange(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                // Delay to allow click events on buttons
                setTimeout(() => setIsFocused(false), 200);
              }}
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent"
              style={{
                minHeight: '24px',
                maxHeight: '200px',
              }}
            />
            
            {/* Character Count */}
            {isNearLimit && (
              <div className="absolute bottom-0 right-0 text-xs text-gray-400 mb-1 mr-1">
                {characterCount}/{maxLength}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Search Button */}
            {onSearch && (
              <button
                onClick={onSearch}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
                title="Search messages"
              >
                <Search className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
              </button>
            )}

            {/* File Attachment */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx,.txt,.md,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.json,.xml,.csv"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
              </button>
            </div>

            {/* Emoji Picker */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
                title="Add emoji"
              >
                <Smile className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 w-80 h-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 overflow-y-auto z-50">
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        className="p-2 text-xl hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mention Picker */}
            <div className="relative" ref={mentionPickerRef}>
              <button
                onClick={() => {
                  if (participants.length > 0) {
                    onChange(value + '@');
                    textareaRef.current?.focus();
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
                title="Mention someone"
                disabled={participants.length === 0}
              >
                <AtSign className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
              </button>

              {showMentionPicker && filteredParticipants.length > 0 && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-50 max-h-64 overflow-y-auto">
                  {filteredParticipants.map((participant) => {
                    const userColor = getUserColor(participant);
                    return (
                      <button
                        key={participant}
                        onClick={() => handleMentionClick(participant)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className={`${userColor.bg} ${userColor.text} text-xs font-semibold`}>
                            {getUserInitials(participant)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-900">{participant}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={onSend}
              disabled={!value.trim() || sending}
              className="p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center relative group"
              style={{
                background: value.trim() && !sending
                  ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                  : 'rgba(217, 119, 6, 0.3)',
                boxShadow: value.trim() && !sending
                  ? '0 4px 15px rgba(217, 119, 6, 0.4), 0 0 20px rgba(217, 119, 6, 0.2)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (value.trim() && !sending) {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(217, 119, 6, 0.6), 0 0 30px rgba(217, 119, 6, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (value.trim() && !sending) {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(217, 119, 6, 0.4), 0 0 20px rgba(217, 119, 6, 0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
              title={sending ? 'Sending...' : 'Send (Cmd/Ctrl + Enter)'}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* AI Suggestions Bar (optional) */}
        {!isFocused && value.length === 0 && (
          <div className="px-3 pb-2 flex items-center gap-2 text-xs text-gray-500">
            <Sparkles className="w-3 h-3" />
            <span>Press Cmd/Ctrl + Enter to send</span>
          </div>
        )}
      </div>
    </div>
  );
}

