using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

public class OfferServiceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    [Fact]
    public async Task CreateOffer_creates_draft_and_transitions_recommended_candidate()
    {
        var candidate = Data.AddCandidate(status: "Recommended");
        var user = Data.AddUser(Roles.Admin);

        var dto = new CreateOfferDto(
            JobTitle: "Senior Backend Developer",
            BaseSalary: 120000,
            Currency: "USD",
            Bonus: 15000,
            Equity: "10,000 RSUs",
            StartDate: DateTime.UtcNow.AddDays(30),
            ExpirationDate: DateTime.UtcNow.AddDays(14),
            Notes: "Remote position with standard healthcare"
        );

        var created = await Offers().CreateOfferAsync(candidate.Id, dto, user.Id, user.Name);

        Assert.NotNull(created);
        Assert.Equal(candidate.Id, created.CandidateId);
        Assert.Equal(120000, created.BaseSalary);
        Assert.Equal("USD", created.Currency);
        Assert.Equal("Draft", created.Status);

        // Candidate status should move to "Offer Preparation"
        var updatedCandidate = await Candidates().GetByIdAsync(candidate.Id);
        Assert.NotNull(updatedCandidate);
        Assert.Equal("Offer Preparation", updatedCandidate.CurrentStatus);
    }

    [Fact]
    public async Task SubmitForApproval_and_Review_flow_works_correctly()
    {
        var candidate = Data.AddCandidate(status: "Recommended");
        var admin = Data.AddUser(Roles.Admin);
        var approver = Data.AddUser(Roles.SuperAdmin);

        var offer = await Offers().CreateOfferAsync(
            candidate.Id,
            new CreateOfferDto("Lead Engineer", 140000, "USD", 20000, null, null, null, null),
            admin.Id,
            admin.Name);
        Assert.NotNull(offer);

        // Submit for approval
        var pending = await Offers().SubmitForApprovalAsync(offer.Id, [approver.Id], admin.Id, admin.Name, null);
        Assert.NotNull(pending);
        Assert.Equal("PendingApproval", pending.Status);
        Assert.Single(pending.Approvals);
        Assert.Equal("Pending", pending.Approvals[0].Status);

        // Review approval - Approve
        var reviewed = await Offers().ReviewApprovalAsync(
            offer.Id,
            new ReviewOfferApprovalDto("Approved", "Approved compensation package"),
            approver.Id,
            approver.Name);
        Assert.NotNull(reviewed);
        Assert.Equal("Approved", reviewed.Status);
        Assert.Equal("Approved", reviewed.Approvals[0].Status);
    }

    [Fact]
    public async Task ExtendOffer_and_Accept_transitions_to_Hired()
    {
        var candidate = Data.AddCandidate(status: "Offer Preparation");
        var admin = Data.AddUser(Roles.Admin);

        var offer = await Offers().CreateOfferAsync(
            candidate.Id,
            new CreateOfferDto("Tech Lead", 160000, "USD", null, null, null, null, null),
            admin.Id,
            admin.Name);
        Assert.NotNull(offer);

        // Extend offer
        var extended = await Offers().ExtendOfferAsync(offer.Id, admin.Id, admin.Name, null);
        Assert.NotNull(extended);
        Assert.Equal("Extended", extended.Status);

        var candAfterExtend = await Candidates().GetByIdAsync(candidate.Id);
        Assert.NotNull(candAfterExtend);
        Assert.Equal("Offer Extended", candAfterExtend.CurrentStatus);

        // Candidate accepts
        var accepted = await Offers().RecordDecisionAsync(
            offer.Id,
            new OfferDecisionDto("Accepted", null),
            admin.Id,
            admin.Name,
            null);
        Assert.NotNull(accepted);
        Assert.Equal("Accepted", accepted.Status);

        var candAfterAccept = await Candidates().GetByIdAsync(candidate.Id);
        Assert.NotNull(candAfterAccept);
        Assert.Equal("Offer Accepted", candAfterAccept.CurrentStatus);

        // Move to Hired
        var hireError = await Candidates().ValidateStatusChangeAsync(
            candidate.Id,
            new StatusChangeDto("Hired", "Candidate completed onboarding"));
        Assert.Null(hireError);

        var hired = await Candidates().AddStatusAsync(
            candidate.Id,
            new StatusChangeDto("Hired", "Welcome aboard!"),
            admin.Name,
            admin.Id);
        Assert.NotNull(hired);

        var candHired = await Candidates().GetByIdAsync(candidate.Id);
        Assert.NotNull(candHired);
        Assert.Equal("Hired", candHired.CurrentStatus);
    }

    [Fact]
    public async Task GenerateOfferLetterPdf_returns_valid_pdf_stream()
    {
        var candidate = Data.AddCandidate(status: "Offer Preparation");
        var admin = Data.AddUser(Roles.Admin);

        var offer = await Offers().CreateOfferAsync(
            candidate.Id,
            new CreateOfferDto(
                "Full Stack Architect",
                150000,
                "USD",
                10000,
                "5,000 Stock Options",
                DateTime.UtcNow.AddDays(20),
                DateTime.UtcNow.AddDays(7),
                "Includes 4 weeks PTO and 401(k) match"),
            admin.Id,
            admin.Name);
        Assert.NotNull(offer);

        var pdfBytes = await Offers().GenerateOfferLetterPdfAsync(offer.Id, null);
        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
        // PDF header magic bytes "%PDF-"
        Assert.True(pdfBytes.Length > 100);
        Assert.Equal((byte)'%', pdfBytes[0]);
        Assert.Equal((byte)'P', pdfBytes[1]);
        Assert.Equal((byte)'D', pdfBytes[2]);
        Assert.Equal((byte)'F', pdfBytes[3]);
    }
}
