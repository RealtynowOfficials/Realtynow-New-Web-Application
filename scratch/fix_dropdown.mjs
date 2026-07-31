import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add state for location dropdown
const stateToAdd = `  const [activeTab, setActiveTab] = useState('Buy');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Hyderabad');
  const locations = ['Hyderabad', 'Mumbai', 'Bengaluru', 'Delhi NCR', 'Pune', 'Chennai'];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);`;

code = code.replace(/const \[activeTab, setActiveTab\] = useState\('Buy'\);/, stateToAdd);

// 2. Replace the select HTML
const selectToReplace = `<div className="flex items-center gap-2 px-3 w-full sm:w-auto min-w-[140px] h-12">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <select className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none w-full appearance-none cursor-pointer h-full">
                    <option>Hyderabad</option>
                    <option>Mumbai</option>
                    <option>Bengaluru</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>`;

const newDropdown = `<div className="relative flex items-center px-3 w-full sm:w-auto min-w-[150px] h-12" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLocationOpen(!isLocationOpen)}
                    className="flex items-center justify-between w-full gap-2 focus:outline-none"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-slate-400" />
                      <span className="text-sm font-bold text-slate-800">{selectedLocation}</span>
                    </div>
                    <ChevronDown className={\`h-4 w-4 text-slate-400 transition-transform duration-200 \${isLocationOpen ? 'rotate-180' : ''}\`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isLocationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-[180px] rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl z-50"
                      >
                        {locations.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => {
                              setSelectedLocation(loc);
                              setIsLocationOpen(false);
                            }}
                            className={\`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors \${
                              selectedLocation === loc
                                ? 'bg-red-50 text-red-600'
                                : 'text-slate-700 hover:bg-slate-50'
                            }\`}
                          >
                            {loc}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>`;

code = code.replace(selectToReplace, newDropdown);

// 3. Remove AISmartSearch from HomePage
code = code.replace(/<AISmartSearch \/>\s*/, '');
code = code.replace(/<TrustSection \/>\s*/, '');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated dropdown and removed duplicate hero elements.');
