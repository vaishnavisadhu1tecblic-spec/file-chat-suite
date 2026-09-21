import Files from ".././../../utils/Files";

function Welcome() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 flex items-center sm:mb-8 lg:mb-10">
        <h2 className="ml-3 text-xl font-semibold"></h2>
      </div>

      <img
        src={Files.WELCOME_IMG}
        alt="WELCOME"
        className="mx-auto mb-6 w-full max-w-[280px] object-contain sm:mb-10 sm:max-w-[350px] lg:mb-12 lg:max-w-[410px]"
      />

      <h2 className="mt-6 text-2xl font-normal leading-tight tracking-tight text-foreground sm:mt-8 sm:text-3xl lg:mt-10 lg:text-4xl">
        One calm space for your team's work.
      </h2>

      <p className="py-4 text-sm leading-6 text-gray-500 sm:py-5 sm:text-base lg:py-6">
        Files, conversations and tasks together in one place. Stay organized and
        work faster with your team.
      </p>
    </div>
  );
}

export default Welcome;
