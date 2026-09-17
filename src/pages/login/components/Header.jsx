function Header() {
  return (
    <header className="flex items-center bg-[#faf8ff] px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
      <h1 className="text-xl font-bold text-violet-700">
        <span className="flex items-center gap-2.5">
          <div className="mb-10 lg:hidden">
            <span className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 8.5A2.5 2.5 0 0 1 8.5 6H18M18 15.5a2.5 2.5 0 0 1-2.5 2.5H6"
                    stroke="currentColor"
                    className="text-primary-foreground"
                    strokeWidth="2"
                    strokeLinecap="round"
                  ></path>
                  <circle
                    cx="17"
                    cy="8.5"
                    r="2.4"
                    className="fill-primary-foreground"
                  ></circle>
                  <circle
                    cx="7"
                    cy="15.5"
                    r="2.4"
                    className="fill-primary-foreground"
                  ></circle>
                </svg>
              </span>

              {/* <span className="text-[17px] font-semibold tracking-tight text-foreground">
                SyncSpace
              </span> */}
            </span>
          </div>

          <div id="designLogo" className="">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 8.5A2.5 2.5 0 0 1 8.5 6H18M18 15.5a2.5 2.5 0 0 1-2.5 2.5H6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="17" cy="8.5" r="2.4" fill="#fff" />
              <circle cx="7" cy="15.5" r="2.4" fill="#fff" />
            </svg>
          </div>

          <span className="text-[17px] font-semibold tracking-tight text-black text-foreground">
            SyncSpace
          </span>
        </span>
      </h1>
    </header>
  );
}

export default Header;
